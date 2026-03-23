import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServiceRoleSupabase, SERVICE_ROLE_ENV_HINT } from '@/lib/supabase-server'
import { getSimulatorUserKey } from '@/lib/simulator/server-user-key'
import { SIMULATOR_DAILY_COMPLETION_LIMIT } from '@/lib/simulator/constants'
import { aggregateWeights, deriveBlindspots, weightsToLabels } from '@/lib/simulator/profile'
import type { CopilotOutput, LlmCitation, LlmCitationsPayload, LlmProfile, RunAnswer, SimulationRound } from '@/lib/simulator/types'
import {
  HIGH_CONFIDENCE_SIMILARITY,
  MIN_CITATION_SIMILARITY,
  searchInterviewCitations,
  type InterviewCitation,
} from '@/lib/simulator/citation-search'

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

function utcDayBounds() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start.getTime() + 86400000)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  const runId = params.runId
  if (!runId) return NextResponse.json({ error: 'Missing runId' }, { status: 400 })

  let body: { copilotProblem?: unknown }
  try {
    body = await request.json().catch(() => ({}))
  } catch {
    body = {}
  }
  const copilotProblem =
    typeof body.copilotProblem === 'string' ? body.copilotProblem.trim().slice(0, 2000) : ''

  const userKey = await getSimulatorUserKey(request)
  const supabase = getServiceRoleSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Simulator requires the Supabase service role key on the server.', details: SERVICE_ROLE_ENV_HINT },
      { status: 503 }
    )
  }
  const supabaseClient = supabase
  const { start, end } = utcDayBounds()

  const { count, error: countErr } = await supabase
    .from('simulation_runs')
    .select('*', { count: 'exact', head: true })
    .eq('user_key', userKey)
    .eq('status', 'completed')
    .gte('completed_at', start)
    .lt('completed_at', end)

  if (countErr) {
    return NextResponse.json({ error: 'Could not verify daily limit' }, { status: 500 })
  }
  if ((count ?? 0) >= SIMULATOR_DAILY_COMPLETION_LIMIT) {
    return NextResponse.json(
      {
        error: `Daily limit reached (${SIMULATOR_DAILY_COMPLETION_LIMIT} completions per day).`,
      },
      { status: 429 }
    )
  }

  const { data: run, error: runErr } = await supabase
    .from('simulation_runs')
    .select('id, user_key, simulation_id, status, answers')
    .eq('id', runId)
    .maybeSingle()

  if (runErr || !run || run.user_key !== userKey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (run.status === 'completed') {
    return NextResponse.json({ error: 'Already completed' }, { status: 400 })
  }

  const { data: sim, error: simErr } = await supabase
    .from('simulation_definitions')
    .select('id, title, teaser, rounds, slug')
    .eq('id', run.simulation_id)
    .maybeSingle()

  if (simErr || !sim || !Array.isArray(sim.rounds)) {
    return NextResponse.json({ error: 'Simulation data missing' }, { status: 500 })
  }

  const rounds = sim.rounds as SimulationRound[]
  const simTitle = sim.title
  const answers = (run.answers as RunAnswer[]) ?? []
  if (answers.length < rounds.length) {
    return NextResponse.json(
      { error: 'Finish all rounds before submitting', completed: answers.length, required: rounds.length },
      { status: 400 }
    )
  }

  const weights = aggregateWeights(
    rounds,
    answers.map((a) => ({ roundIndex: a.roundIndex, choiceId: a.choiceId }))
  )
  const labels = weightsToLabels(weights)
  const blindRule = deriveBlindspots(weights)

  const openAiKey = process.env.OPENAI_API_KEY?.trim()
  if (!openAiKey) {
    return NextResponse.json(
      {
        error:
          'OPENAI_API_KEY not configured for the Next.js server. Put it in frontend/.env.local (or repo-root .env) and restart `next dev`.',
      },
      { status: 500 }
    )
  }

  const choiceSummary = answers
    .map((a) => {
      const r = rounds[a.roundIndex]
      const c = r?.choices.find((x) => x.id === a.choiceId)
      return `Round ${a.roundIndex + 1}: ${c?.label ?? a.choiceId}`
    })
    .join('\n')

  const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}...` : s)

  async function getOrBuildEvidenceForAnswer(a: RunAnswer): Promise<{
    roundIndex: number
    choiceId: string
    citations: InterviewCitation[]
    hasHighConfidence: boolean
  }> {
    const cached = await supabaseClient
      .from('simulation_run_choice_evidence')
      .select('citations, has_high_confidence')
      .eq('run_id', runId)
      .eq('round_index', a.roundIndex)
      .eq('choice_id', a.choiceId)
      .maybeSingle()

    if (cached.data?.citations && Array.isArray(cached.data.citations) && cached.data.citations.length) {
      const citations = cached.data.citations as InterviewCitation[]
      return {
        roundIndex: a.roundIndex,
        choiceId: a.choiceId,
        citations,
        hasHighConfidence: !!cached.data.has_high_confidence,
      }
    }

    const round = rounds[a.roundIndex]
    const choice = round?.choices.find((c) => c.id === a.choiceId)
    if (!round || !choice) {
      return { roundIndex: a.roundIndex, choiceId: a.choiceId, citations: [], hasHighConfidence: false }
    }

    const hint = choice.citationQueryHint?.trim()
    const queryParts = [
      simTitle,
      round.prompt,
      choice.label,
      choice.feedback.layer1,
      choice.feedback.layer2,
      choice.feedback.layer3,
      choice.layer4_static.operatorLine,
      choice.layer4_static.takeaway,
      hint,
    ].filter(Boolean)

    const queryText = queryParts.join('\n\n')

    const citations = await searchInterviewCitations(supabaseClient, queryText, { limit: 8, matchThreshold: 0 })
    const hasHighConfidence = citations.some((c) => c.highConfidence)

    try {
      await supabaseClient.from('simulation_run_choice_evidence').upsert(
        {
          run_id: runId,
          round_index: a.roundIndex,
          choice_id: a.choiceId,
          query_text: queryText.slice(0, 8000),
          citations,
          has_high_confidence: hasHighConfidence,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'run_id, round_index, choice_id' }
      )
    } catch (e) {
      console.error('[simulator/complete] evidence cache upsert failed', e)
    }

    return { roundIndex: a.roundIndex, choiceId: a.choiceId, citations, hasHighConfidence }
  }

  const evidenceByAnswer = []
  for (const a of answers) {
    evidenceByAnswer.push(await getOrBuildEvidenceForAnswer(a))
  }

  const evidenceForPrompt = evidenceByAnswer.map((e) => ({
    roundIndex: e.roundIndex,
    choiceId: e.choiceId,
    hasHighConfidence: e.hasHighConfidence,
    citations: e.citations
      .slice()
      .sort((x, y) => (y.similarity ?? 0) - (x.similarity ?? 0))
      .slice(0, 3)
      .map((c) => ({
        guestName: c.guestName,
        episodeTitle: c.episodeTitle,
        episodeUrl: c.episodeUrl,
        timestamp: c.timestamp,
        quote: truncate(c.text, 320),
        highConfidence: c.highConfidence,
        similarity: c.similarity,
      })),
  }))

  const citationsFallback: LlmCitationsPayload = {
    hasHighConfidence: evidenceByAnswer.some((e) => e.citations.some((c) => c.highConfidence)),
    citations: evidenceByAnswer
      .flatMap((e) =>
        e.citations
          .slice()
          .sort((x, y) => (y.similarity ?? 0) - (x.similarity ?? 0))
          .slice(0, 1)
          .map((c) => ({
            roundIndex: e.roundIndex,
            choiceId: e.choiceId,
            guestName: c.guestName,
            episodeTitle: c.episodeTitle,
            episodeUrl: c.episodeUrl,
            timestamp: c.timestamp,
            quote: truncate(c.text, 280),
            confidence: (c.highConfidence ? 'high' : 'medium') as LlmCitation['confidence'],
          }))
      )
      .slice(0, 5),
  }

  const systemPrompt = `You are a sharp coach for builders. Output ONLY valid JSON, no markdown. Be terse.`

  const userPrompt = `Simulation: "${sim.title}"
User choices (in order):
${choiceSummary}

Rule-based axes (numeric -1..1, then labels):
- speedVsDepth: ${weights.speedVsDepth.toFixed(2)} → ${labels.speedVsDepth}
- shortVsLong: ${weights.shortVsLong.toFixed(2)} → ${labels.shortVsLong}
- riskVsConviction: ${weights.riskVsConviction.toFixed(2)} → ${labels.riskVsConviction}
Rule-based blindspots: ${JSON.stringify(blindRule)}

Evidence snippets (JSON). Select quotes ONLY from this evidence:
${JSON.stringify(evidenceForPrompt)}

Return JSON with this exact shape:
{
  "headline": "one line, memorable operator-style profile",
  "speedVsDepth": "short label",
  "shortVsLong": "short label",
  "riskVsConviction": "short label",
  "blindspots": ["max 4 short bullets"],
  "copilotNudge": "one line tying profile to how they should work next",
  "citations": [
    {
      "roundIndex": 0,
      "choiceId": "a",
      "guestName": "Guest name",
      "episodeTitle": "Episode title",
      "episodeUrl": "string|null",
      "timestamp": "string|null",
      "quote": "exact quote from evidence",
      "confidence": "high|medium|low"
    }
  ],
  "hasHighConfidence": true,
  "copilot": ${copilotProblem ? `{
    "howToApproach": ["bullet","bullet"],
    "whatToDo": ["bullet","bullet"],
    "tradeoffs": ["bullet"],
    "whatNotToDo": ["bullet"],
    "profileNudge": "one line referencing their tendency"
  }` : 'null'}
}

If copilot is requested, user real problem: "${copilotProblem.replace(/"/g, '\\"')}"
If no copilot problem, set copilot to null.`

  let parsed: (LlmProfile & { copilot?: CopilotOutput | null; citations?: LlmCitation[]; hasHighConfidence?: boolean }) | null = null
  try {
    const openai = new OpenAI({ apiKey: openAiKey })
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
    const text = response.choices[0]?.message?.content ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    parsed = JSON.parse(jsonMatch[0]) as typeof parsed
  } catch (e) {
    console.error('[simulator/complete] LLM', e)
    parsed = {
      headline: 'You think like an operator who moves with intent and tradeoffs.',
      speedVsDepth: labels.speedVsDepth,
      shortVsLong: labels.shortVsLong,
      riskVsConviction: labels.riskVsConviction,
      blindspots: blindRule,
      copilotNudge: 'Stress-test your assumptions before the next big bet.',
      citations: citationsFallback.citations,
      hasHighConfidence: citationsFallback.hasHighConfidence,
      copilot: copilotProblem
        ? {
            howToApproach: ['Name the decision', 'Gather evidence'],
            whatToDo: ['Talk to users', 'Ship one small test'],
            tradeoffs: ['Speed vs clarity'],
            whatNotToDo: ['Don’t optimize only for optics'],
            profileNudge: blindRule[0] ?? 'Stay honest about tradeoffs.',
          }
        : null,
    }
  }

  if (!parsed) {
    return NextResponse.json({ error: 'LLM profile generation failed' }, { status: 500 })
  }

  const llmProfile: LlmProfile = {
    headline: parsed.headline,
    speedVsDepth: parsed.speedVsDepth ?? labels.speedVsDepth,
    shortVsLong: parsed.shortVsLong ?? labels.shortVsLong,
    riskVsConviction: parsed.riskVsConviction ?? labels.riskVsConviction,
    blindspots: Array.isArray(parsed.blindspots) ? parsed.blindspots : blindRule,
    copilotNudge: parsed.copilotNudge ?? '',
  }

  const normalizeConfidence = (v: string): LlmCitation['confidence'] => {
    if (v === 'high' || v === 'medium' || v === 'low') return v
    return 'medium'
  }

  const llmCitations: LlmCitationsPayload = {
    hasHighConfidence: !!parsed.hasHighConfidence || citationsFallback.hasHighConfidence,
    citations: Array.isArray((parsed as any).citations)
      ? ((parsed as any).citations as LlmCitation[]).map((c) => ({
          roundIndex: c.roundIndex,
          choiceId: c.choiceId,
          guestName: typeof c.guestName === 'string' ? c.guestName : 'Guest',
          episodeTitle: typeof c.episodeTitle === 'string' ? c.episodeTitle : 'Episode',
          episodeUrl: c.episodeUrl ?? null,
          timestamp: c.timestamp ?? null,
          quote: typeof (c as any).quote === 'string' ? (c as any).quote : '',
          confidence: normalizeConfidence(String(c.confidence)),
        }))
      : citationsFallback.citations,
  }

  // If the LLM returns citations but misses the “high” tier, ensure at least one
  // high-confidence gem is present for the UI.
  const fallbackHigh = citationsFallback.citations.find((c) => c.confidence === 'high')
  if (fallbackHigh && llmCitations.hasHighConfidence && !llmCitations.citations.some((c) => c.confidence === 'high')) {
    llmCitations.citations = [fallbackHigh, ...llmCitations.citations].slice(0, 5)
  }

  const copilotOut: CopilotOutput | null =
    copilotProblem && parsed.copilot
      ? {
          howToApproach: parsed.copilot.howToApproach ?? [],
          whatToDo: parsed.copilot.whatToDo ?? [],
          tradeoffs: parsed.copilot.tradeoffs ?? [],
          whatNotToDo: parsed.copilot.whatNotToDo ?? [],
          profileNudge: parsed.copilot.profileNudge ?? '',
        }
      : null

  const summaryText = `${llmProfile.headline}\n${llmProfile.copilotNudge}`

  const { data: updated, error: updErr } = await supabase
    .from('simulation_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      llm_summary: summaryText,
      llm_profile: llmProfile as unknown as Record<string, unknown>,
      llm_citations: llmCitations as unknown as Record<string, unknown>,
      copilot_input: copilotProblem || null,
      copilot_output: copilotOut as unknown as Record<string, unknown> | null,
    })
    .eq('id', runId)
    .eq('user_key', userKey)
    .select('id, status, completed_at, llm_summary, llm_profile, llm_citations, copilot_input, copilot_output')
    .single()

  if (updErr || !updated) {
    console.error('[simulator/complete] update', updErr)
    return NextResponse.json({ error: 'Could not save completion' }, { status: 500 })
  }

  return NextResponse.json({
    run: updated,
    ruleLabels: labels,
    ruleWeights: weights,
  })
}
