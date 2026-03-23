import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleSupabase, SERVICE_ROLE_ENV_HINT } from '@/lib/supabase-server'
import {
  HIGH_CONFIDENCE_SIMILARITY,
  MIN_CITATION_SIMILARITY,
  searchInterviewCitations,
} from '@/lib/simulator/citation-search'
import type { SimulationRound } from '@/lib/simulator/types'

/**
 * POST body:
 * {
 *   runId?: string
 *   simulationId, roundIndex, choiceId
 * }
 *
 * Returns embedding-based interview citations (chunks) for the selected choice + round.
 * If `runId` is provided, the evidence is cached into Supabase.
 */
export async function POST(request: NextRequest) {
  const supabase = getServiceRoleSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Simulator requires the Supabase service role key.', details: SERVICE_ROLE_ENV_HINT },
      { status: 503 }
    )
  }

  let body: { runId?: unknown; simulationId?: unknown; roundIndex?: unknown; choiceId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const runId = typeof body.runId === 'string' ? body.runId.trim() : ''
  const simulationId = typeof body.simulationId === 'string' ? body.simulationId.trim() : ''
  const roundIndexRaw = body.roundIndex
  const choiceId = typeof body.choiceId === 'string' ? body.choiceId.trim() : ''

  const roundIndex =
    typeof roundIndexRaw === 'number' && Number.isFinite(roundIndexRaw)
      ? Math.floor(roundIndexRaw)
      : typeof roundIndexRaw === 'string'
        ? parseInt(roundIndexRaw, 10)
        : NaN

  if (!simulationId || !Number.isFinite(roundIndex) || roundIndex < 0 || !choiceId) {
    return NextResponse.json(
      { error: 'simulationId, roundIndex (number), and choiceId are required' },
      { status: 400 }
    )
  }

  const { data: sim, error: simErr } = await supabase
    .from('simulation_definitions')
    .select('id, title, rounds, slug')
    .eq('id', simulationId)
    .eq('published', true)
    .maybeSingle()

  if (simErr || !sim) {
    return NextResponse.json({ error: 'Simulation not found' }, { status: 404 })
  }

  const rounds = sim.rounds as SimulationRound[]
  const round = rounds[roundIndex]
  if (!round) {
    return NextResponse.json({ error: 'Invalid round index' }, { status: 400 })
  }

  const choice = round.choices.find((c) => c.id === choiceId)
  if (!choice) {
    return NextResponse.json({ error: 'Invalid choice id' }, { status: 400 })
  }

  const hint = (choice as { citationQueryHint?: string }).citationQueryHint?.trim()

  const queryParts = [
    sim.title,
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

  try {
    const citations = await searchInterviewCitations(supabase, queryText, { limit: 8, matchThreshold: 0 })
    const hasHighConfidence = citations.some((c) => c.highConfidence)

    // Cache evidence for this run/answer so final summaries can include the exact same “gems”.
    if (runId) {
      try {
        await supabase
          .from('simulation_run_choice_evidence')
          .upsert(
            {
              run_id: runId,
              round_index: roundIndex,
              choice_id: choiceId,
              query_text: queryText.slice(0, 8000),
              citations,
              has_high_confidence: hasHighConfidence,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'run_id, round_index, choice_id' }
          )
      } catch (cacheErr) {
        // Evidence caching is non-fatal; UI can still render citations.
        console.error('[simulator/citations] cache error', cacheErr)
      }
    }

    return NextResponse.json({
      simulationSlug: sim.slug,
      simulationTitle: sim.title,
      roundIndex,
      choiceId,
      queryPreview: queryText.slice(0, 280),
      citations,
      hasHighConfidence,
      meta: {
        minSimilarity: MIN_CITATION_SIMILARITY,
        highConfidenceAt: HIGH_CONFIDENCE_SIMILARITY,
      },
    })
  } catch (e) {
    console.error('[simulator/citations]', e)
    const message = e instanceof Error ? e.message : 'Citation search failed'
    if (message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        {
          error: message,
          hint: 'Set OPENAI_API_KEY for simulator citation embeddings.',
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
