import path from 'node:path'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

function loadEnv(frontendDir) {
  dotenv.config({ path: path.join(frontendDir, '.env.local') })
  dotenv.config({ path: path.join(frontendDir, '../.env') })
}

function parseArgs(argv) {
  const args = { limit: null, slug: null, dryRun: false, retries: 0, timeoutMs: 70000, model: 'gpt-4o-mini' }
  const readNumberArg = (value, fallback) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--limit') {
      const n = readNumberArg(argv[i + 1], null)
      args.limit = n && n > 0 ? n : null
    }
    if (a === '--slug') args.slug = argv[i + 1] ?? null
    if (a === '--dry-run') args.dryRun = true
    if (a === '--retries') args.retries = Math.max(0, readNumberArg(argv[i + 1], 0))
    if (a === '--timeout-ms') args.timeoutMs = Math.max(10000, readNumberArg(argv[i + 1], 70000))
    if (a === '--model') args.model = argv[i + 1] ?? 'gpt-4o-mini'
  }
  return args
}

function extractJson(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

function extractRoundsArray(parsed) {
  if (!parsed || typeof parsed !== 'object') return null
  if (Array.isArray(parsed.rounds2to5)) return parsed.rounds2to5
  if (Array.isArray(parsed.rounds)) return parsed.rounds.slice(1)
  if (Array.isArray(parsed.rounds_2_to_5)) return parsed.rounds_2_to_5
  for (const value of Object.values(parsed)) {
    if (Array.isArray(value) && value.length >= 4) return value
  }
  return null
}

function withTimeout(promise, timeoutMs, label = 'operation') {
  let timeoutId = null
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

function clampWeight(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(-1, Math.min(1, Number(n.toFixed(2))))
}

function normalizeChoice(choice, fallbackId) {
  const id = ['a', 'b', 'c'].includes(choice?.id) ? choice.id : fallbackId
  const label = String(choice?.label ?? '').trim()
  const layer1 = String(choice?.feedback?.layer1 ?? choice?.['feedback.layer1'] ?? '').trim()
  const layer2 = String(choice?.feedback?.layer2 ?? choice?.['feedback.layer2'] ?? '').trim()
  const layer3 = String(choice?.feedback?.layer3 ?? choice?.['feedback.layer3'] ?? '').trim()
  const headline = String(choice?.layer4_static?.headline ?? 'How real operators approached this').trim()
  const operatorLine = String(choice?.layer4_static?.operatorLine ?? choice?.['layer4_static.operatorLine'] ?? '').trim()
  const whatTheyDid = Array.isArray(choice?.layer4_static?.whatTheyDid)
    ? choice.layer4_static.whatTheyDid.map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
    : Array.isArray(choice?.['layer4_static.whatTheyDid'])
      ? choice['layer4_static.whatTheyDid'].map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
    : []
  const impact = Array.isArray(choice?.layer4_static?.impact)
    ? choice.layer4_static.impact.map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
    : Array.isArray(choice?.['layer4_static.impact'])
      ? choice['layer4_static.impact'].map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
    : []
  const takeaway = String(choice?.layer4_static?.takeaway ?? choice?.['layer4_static.takeaway'] ?? '').trim()
  const hint = String(choice?.citationQueryHint ?? choice?.['citation_query_hint'] ?? '').trim()

  return {
    id,
    label,
    feedback: { layer1, layer2, layer3 },
    layer4_static: {
      headline,
      operatorLine,
      whatTheyDid: whatTheyDid.length ? whatTheyDid : ['Defined assumptions', 'Set checkpoints', 'Adjusted with evidence'],
      impact: impact.length ? impact : ['Clearer alignment', 'Higher decision quality'],
      videoUrl: null,
      takeaway,
    },
    profileWeights: {
      speedVsDepth: clampWeight(choice?.profileWeights?.speedVsDepth),
      shortVsLong: clampWeight(choice?.profileWeights?.shortVsLong),
      riskVsConviction: clampWeight(choice?.profileWeights?.riskVsConviction),
    },
    citationQueryHint: hint,
  }
}

function normalizeRound(round) {
  const prompt = String(round?.prompt ?? '').trim()
  const rawChoices = Array.isArray(round?.choices) ? round.choices : []
  const ids = ['a', 'b', 'c']
  const choices = ids.map((id, i) => normalizeChoice(rawChoices[i] ?? { id }, id))
  return { prompt, choices }
}

function validateRounds(rounds) {
  if (!Array.isArray(rounds) || rounds.length !== 4) return false
  for (const r of rounds) {
    if (!r?.prompt || !Array.isArray(r.choices) || r.choices.length !== 3) return false
    const ids = r.choices.map((c) => c.id).sort().join(',')
    if (ids !== 'a,b,c') return false
  }
  return true
}

function coerceRounds2to5(rawRounds) {
  const rounds = Array.isArray(rawRounds) ? rawRounds.map(normalizeRound) : []
  if (rounds.length < 4) return null
  const firstFour = rounds.slice(0, 4).map((r) => ({
    prompt: r.prompt,
    choices: ['a', 'b', 'c'].map((id, idx) => {
      const c = r.choices[idx] ?? {}
      const normalized = normalizeChoice({ ...c, id }, id)
      return { ...normalized, id }
    }),
  }))
  return validateRounds(firstFour) ? firstFour : null
}

function buildPrompt(sim) {
  const round1 = Array.isArray(sim.rounds) ? sim.rounds[0] : null
  const round1Prompt = String(round1?.prompt ?? '').trim()
  const round1Choices = Array.isArray(round1?.choices)
    ? round1.choices.map((c) => String(c?.label ?? '').trim()).filter(Boolean).slice(0, 3)
    : []

  return `You are rewriting an "Operator Simulator" scenario.

Goal:
- Make rounds 2-5 more vivid, specific, and high-stakes.
- Ensure each choice is clearly different and feels realistic.
- Maximize learning value: each choice should teach a practical operator lesson.
- Keep tone mature and practical, never fluffy.

Scenario metadata:
- Track: ${sim.track}
- Title: ${sim.title}
- Teaser: ${sim.teaser ?? ''}
- Slug: ${sim.slug}

Output constraints (MUST FOLLOW):
1) Return STRICT JSON object: {"rounds2to5":[...]} with exactly 4 rounds.
2) Each round has:
   - prompt: 2-4 sentences, concrete backstory, tension, constraints.
   - choices: exactly 3 choices with ids "a","b","c" in order.
3) Each choice must include:
   - label (max ~110 chars, decisive action wording)
   - feedback.layer1, feedback.layer2, feedback.layer3
     * layer1 = immediate impact
     * layer2 = trade-off
     * layer3 = if repeated pattern
     * Do NOT prefix with "Immediate impact:", "Trade-off:", or "If repeated:"
   - layer4_static:
     * headline: "How real operators approached this"
     * operatorLine: 1-2 sentences with concrete operator pattern/framework
     * whatTheyDid: 2-4 bullets (specific actions)
     * impact: 2-3 bullets (outcomes)
     * videoUrl: null
     * takeaway: 1 sentence, memorable and specific
   - profileWeights:
     * speedVsDepth, shortVsLong, riskVsConviction in [-1,1]
   - citationQueryHint:
     * include theme-specific search terms for retrieval
4) Keep semantic variety high. Avoid repeated sentence templates.
5) Keep alignment with track:
   - product: diagnosis, UX friction, roadmap tradeoffs, PMF signals
   - growth: loops, CAC/LTV, retention, channel risk
   - strategy: bet sizing, timing, downside planning, optionality
   - leadership: hiring, trust, org design, accountability, conflict
   - mixed: cross-functional tradeoffs under constraints

Context from round 1 (keep narrative continuity with this setup):
- Round 1 prompt: ${round1Prompt}
- Round 1 choices: ${round1Choices.join(' | ')}

Return only JSON.`
}

async function regenerateRounds(openai, sim, timeoutMs, model, debug) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.8,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a senior product/strategy simulation writer. Produce realistic, high-learning, non-generic scenarios.',
      },
      {
        role: 'user',
        content: buildPrompt(sim),
      },
    ],
  }, { signal: controller.signal }).finally(() => clearTimeout(timer))

  const raw = completion.choices?.[0]?.message?.content
  const parsed = extractJson(raw)
  if (debug) {
    const keys = parsed && typeof parsed === 'object' ? Object.keys(parsed).join(',') : 'none'
    console.log(`[debug:${sim.slug}] parsed keys: ${keys}`)
  }
  const modelRounds = extractRoundsArray(parsed)
  if (!modelRounds) throw new Error('Model response missing rounds array')
  const rounds = coerceRounds2to5(modelRounds)
  if (!rounds) {
    if (debug) {
      const snippet = String(raw ?? '').slice(0, 800).replace(/\s+/g, ' ')
      console.log(`[debug:${sim.slug}] raw snippet: ${snippet}`)
    }
    throw new Error('Invalid rounds shape from model')
  }
  return rounds
}

async function main() {
  const cwd = process.cwd()
  loadEnv(cwd)
  const args = parseArgs(process.argv.slice(2))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
  const openAiKey = process.env.OPENAI_API_KEY?.trim()
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase env keys')
  if (!openAiKey) throw new Error('Missing OPENAI_API_KEY')

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  const openai = new OpenAI({ apiKey: openAiKey })

  const { data: podcast, error: podcastErr } = await supabase
    .from('podcasts')
    .select('id')
    .eq('slug', 'lennys-podcast')
    .maybeSingle()
  if (podcastErr || !podcast?.id) throw new Error('Podcast not found: lennys-podcast')

  let query = supabase
    .from('simulation_definitions')
    .select('id,slug,track,title,teaser,rounds')
    .eq('podcast_id', podcast.id)
    .order('display_order', { ascending: true })

  if (args.slug) query = query.eq('slug', args.slug)
  if (args.limit) query = query.limit(args.limit)

  const { data: sims, error } = await query
  if (error) throw error
  if (!sims?.length) {
    console.log('No simulations found for regeneration.')
    return
  }

  let updated = 0
  for (const sim of sims) {
    try {
      console.log(`\n[${updated + 1}/${sims.length}] Regenerating ${sim.slug}...`)
      let rounds2to5 = null
      let lastErr = null
      for (let attempt = 0; attempt <= args.retries; attempt += 1) {
        try {
          rounds2to5 = await withTimeout(
            regenerateRounds(openai, sim, args.timeoutMs, args.model, process.env.SIM_DEBUG === '1'),
            args.timeoutMs + 5000,
            `LLM call for ${sim.slug}`
          )
          break
        } catch (err) {
          lastErr = err
          if (attempt < args.retries) {
            console.warn(`Retrying ${sim.slug} (attempt ${attempt + 2}/${args.retries + 1})...`)
          }
        }
      }
      if (!rounds2to5) throw lastErr ?? new Error('Unknown generation error')
      if (args.dryRun) {
        console.log(`Dry run OK: ${sim.slug}`)
        continue
      }
      const existingRounds = Array.isArray(sim.rounds) ? sim.rounds : []
      const round1 = normalizeRound(existingRounds[0] ?? {})
      const rounds = [round1, ...rounds2to5]
      const { error: updErr } = await supabase
        .from('simulation_definitions')
        .update({ rounds, updated_at: new Date().toISOString() })
        .eq('id', sim.id)
      if (updErr) throw updErr
      updated += 1
      console.log(`Updated: ${sim.slug}`)
    } catch (e) {
      console.error(`Failed: ${sim.slug}`, e instanceof Error ? e.message : e)
    }
  }

  console.log(`\nDone. Updated ${updated}/${sims.length} simulations.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
