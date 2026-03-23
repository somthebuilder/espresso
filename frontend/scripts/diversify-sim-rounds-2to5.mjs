import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

function loadEnv(frontendDir) {
  dotenv.config({ path: path.join(frontendDir, '.env.local') })
  dotenv.config({ path: path.join(frontendDir, '../.env') })
}

function hashInt(input) {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return Math.abs(h >>> 0)
}

function pick(arr, key) {
  return arr[hashInt(key) % arr.length]
}

function themeFromTitle(title) {
  return String(title).includes(':') ? String(title).split(':').slice(1).join(':').trim() : String(title)
}

const promptsByTrack = {
  product: {
    2: ['Round 2 - Prioritization: You can only fund one product path for "{theme}" this sprint. Which path gets resources?', 'Round 2 - Scope call: Team capacity is tight. Which "{theme}" bet do you prioritize now?'],
    3: ['Round 3 - Cross-functional tension: Growth and Design disagree on "{theme}". What alignment move do you make?', 'Round 3 - Alignment conflict: Product, Sales, and Support want different fixes for "{theme}". What do you do?'],
    4: ['Round 4 - Execution constraint: Engineering bandwidth drops 30% while "{theme}" goals stay fixed. What is your move?', 'Round 4 - Constraint shock: You lose key ICs mid-cycle on "{theme}". How do you adjust?'],
    5: ['Round 5 - Final commitment: Which operating principle do you commit to for "{theme}" over the next month?', 'Round 5 - Leadership call: What single metric/principle anchors your "{theme}" plan for 30 days?'],
  },
  growth: {
    2: ['Round 2 - Budget allocation: You can fund one growth path for "{theme}". Where do you place the bet?', 'Round 2 - Resource split: Finance cut budget. Which "{theme}" lever survives?'],
    3: ['Round 3 - Team conflict: Product and Growth disagree on "{theme}" impact. How do you reset execution?', 'Round 3 - Signal conflict: Metrics and qualitative feedback disagree on "{theme}". What is your call?'],
    4: ['Round 4 - Channel shock: Performance volatility spikes for "{theme}". What is your stabilizing move?', 'Round 4 - Constraint shock: CAC worsens while targets remain. What do you change first on "{theme}"?'],
    5: ['Round 5 - Final commitment: Which growth principle do you commit to for "{theme}" next month?', 'Round 5 - Operator bet: What one rule governs your "{theme}" strategy for 30 days?'],
  },
  strategy: {
    2: ['Round 2 - Bet sizing: How much conviction capital do you allocate to "{theme}" now?', 'Round 2 - Portfolio call: Which strategic bet around "{theme}" gets protected?'],
    3: ['Round 3 - Stakeholder split: Board and leadership differ on "{theme}" risk tolerance. What do you do?', 'Round 3 - Narrative tension: Teams disagree on the "{theme}" thesis. How do you align?'],
    4: ['Round 4 - Downside scenario: The downside case for "{theme}" starts materializing. What is your move?', 'Round 4 - Optionality test: You can no longer support all options in "{theme}". What gets cut?'],
    5: ['Round 5 - Final commitment: What strategic principle anchors your "{theme}" decision for the next quarter?', 'Round 5 - Closing call: Which irreversible commitment do you make on "{theme}" now?'],
  },
  leadership: {
    2: ['Round 2 - Process design: What leadership mechanism do you set for "{theme}" this week?', 'Round 2 - Team operating model: Which operating cadence best addresses "{theme}"?'],
    3: ['Round 3 - People conflict: Senior team members disagree on "{theme}" direction. How do you intervene?', 'Round 3 - Calibration tension: Strong opinions clash on "{theme}". What is your leadership move?'],
    4: ['Round 4 - Performance pressure: Delivery pressure rises while handling "{theme}". What do you optimize first?', 'Round 4 - Capacity reality: Team bandwidth is constrained but "{theme}" stakes are high. What now?'],
    5: ['Round 5 - Final commitment: Which leadership principle governs "{theme}" for the next 30 days?', 'Round 5 - Cultural call: What norm do you codify around "{theme}" starting now?'],
  },
  mixed: {
    2: ['Round 2 - Prioritization under uncertainty: Which "{theme}" path gets immediate focus?', 'Round 2 - Trade-off call: You can only protect one "{theme}" objective this sprint. Which one?'],
    3: ['Round 3 - Cross-functional disagreement: Teams conflict on "{theme}" approach. How do you align?', 'Round 3 - Operating conflict: Multiple functions disagree on "{theme}" success criteria. What is your reset?'],
    4: ['Round 4 - Constraint shock: Time and capacity tighten around "{theme}". What is your operating move?', 'Round 4 - Volatility response: Conditions changed fast for "{theme}". Where do you intervene first?'],
    5: ['Round 5 - Final commitment: Which operating rule anchors your "{theme}" execution for 30 days?', 'Round 5 - Closing principle: What single principle drives your "{theme}" decisions next month?'],
  },
}

const choicePoolsByTrack = {
  product: [
    'Ship a narrowly-scoped fix with clear rollback criteria',
    'Run a 5-day diagnosis sprint before committing roadmap changes',
    'Prioritize one high-friction user segment and optimize deeply',
    'Instrument a missing funnel step before larger product changes',
    'Cut lower-priority work to protect a focused product strike team',
  ],
  growth: [
    'Protect highest-quality cohorts and cut low-intent spend',
    'Shift budget toward retention/lifecycle while acquisition is unstable',
    'Launch two micro-channel tests with strict stop-rules',
    'Consolidate spend into one proven channel and pause the rest',
    'Pair channel experiments with onboarding conversion fixes',
  ],
  strategy: [
    'Commit to a single thesis with explicit kill criteria',
    'Place a bounded option bet while protecting core cash flow',
    'Delay expansion until one critical assumption is validated',
    'Re-scope the bet to a wedge market before broader rollout',
    'Protect optionality by staging decisions at fixed review gates',
  ],
  leadership: [
    'Set one accountable owner and publish weekly decision cadence',
    'Run a targeted calibration loop before irreversible decisions',
    'Address expectation gaps directly with a 30-day operating plan',
    'Protect hiring/performance bar despite short-term pressure',
    'Reassign responsibilities to reduce decision bottlenecks',
  ],
  mixed: [
    'Set a shared north-star metric and one counter-metric',
    'Run two time-boxed bets with explicit ownership boundaries',
    'Cut one conflicting priority to restore focus',
    'Sequence execution into 2-week checkpoints with kill-rules',
    'Publish a cross-functional decision memo with owners and deadlines',
  ],
}

function makeChoice(track, theme, roundNum, slot, slug) {
  const pool = choicePoolsByTrack[track] ?? choicePoolsByTrack.mixed
  const label = pick(pool, `${slug}:${track}:r${roundNum}:${slot}`)
  const weights = [
    { speedVsDepth: 0.25, shortVsLong: 0.15, riskVsConviction: 0.1 },
    { speedVsDepth: -0.2, shortVsLong: -0.2, riskVsConviction: 0.05 },
    { speedVsDepth: 0.05, shortVsLong: 0.05, riskVsConviction: 0.25 },
  ][slot]
  const ids = ['a', 'b', 'c']
  return {
    id: ids[slot],
    label: `${label} for "${theme}"`,
    feedback: {
      layer1: 'You made an explicit operator trade-off.',
      layer2: 'Trade-off: this improves one axis while introducing execution risk elsewhere.',
      layer3: 'If repeated, this pattern shapes team behavior and decision quality.',
    },
    layer4_static: {
      headline: 'How real operators approached this',
      operatorLine: 'Strong operators set clear owners, explicit assumptions, and review rhythms.',
      whatTheyDid: ['Named the decision owner', 'Set measurable checkpoints', 'Adjusted based on evidence'],
      impact: ['Faster alignment', 'Cleaner accountability'],
      videoUrl: null,
      takeaway: 'Quality decisions are clear, testable, and revisited on cadence.',
    },
    profileWeights: weights,
    citationQueryHint: `${track} ${theme} round ${roundNum} operator tradeoff decision cadence`,
  }
}

async function main() {
  const cwd = process.cwd()
  loadEnv(cwd)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
  if (!url || !key) throw new Error('Missing Supabase env keys.')

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data: podcast } = await supabase.from('podcasts').select('id').eq('slug', 'lennys-podcast').maybeSingle()
  if (!podcast?.id) throw new Error('Podcast not found: lennys-podcast')

  const { data: sims, error } = await supabase
    .from('simulation_definitions')
    .select('id, slug, title, track, rounds')
    .eq('podcast_id', podcast.id)
    .order('display_order', { ascending: true })
  if (error) throw new Error(error.message)

  let updated = 0
  for (const sim of sims ?? []) {
    const rounds = Array.isArray(sim.rounds) ? [...sim.rounds] : []
    if (!rounds.length) continue
    const theme = themeFromTitle(sim.title)
    const track = sim.track
    const trackPrompts = promptsByTrack[track] ?? promptsByTrack.mixed

    for (let r = 2; r <= 5; r += 1) {
      const promptTemplate = pick(trackPrompts[r], `${sim.slug}:${track}:prompt:r${r}`)
      const prompt = promptTemplate.replaceAll('{theme}', theme)
      const choices = [0, 1, 2].map((slot) => makeChoice(track, theme, r, slot, sim.slug))
      const roundObj = { prompt, choices }
      const idx = r - 1
      if (idx < rounds.length) rounds[idx] = roundObj
      else rounds.push(roundObj)
    }

    const { error: updErr } = await supabase
      .from('simulation_definitions')
      .update({ rounds, updated_at: new Date().toISOString() })
      .eq('id', sim.id)
    if (updErr) throw new Error(`Failed ${sim.slug}: ${updErr.message}`)
    updated += 1
  }

  console.log(`Diversified rounds 2-5 for ${updated} simulations.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

