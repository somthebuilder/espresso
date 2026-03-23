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

function pickDistinct(arr, key, used) {
  if (!arr.length) return ''
  const start = hashInt(key) % arr.length
  for (let i = 0; i < arr.length; i += 1) {
    const candidate = arr[(start + i) % arr.length]
    if (!used.has(candidate)) return candidate
  }
  return arr[start]
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
    'Time-box a usability debt sprint before adding net-new features',
    'Freeze non-critical launches and fix first-run experience bottlenecks',
    'Replace one bloated workflow with a simpler guided path',
    'Define one activation milestone and remove steps that do not support it',
    'Run side-by-side onboarding variants for only the at-risk cohort',
    'De-scope advanced settings and ship a default-first product flow',
    'Pair PM and design on daily friction triage with engineering',
  ],
  growth: [
    'Protect highest-quality cohorts and cut low-intent spend',
    'Shift budget toward retention/lifecycle while acquisition is unstable',
    'Launch two micro-channel tests with strict stop-rules',
    'Consolidate spend into one proven channel and pause the rest',
    'Pair channel experiments with onboarding conversion fixes',
    'Move budget to referral and partner loops with capped downside',
    'Prioritize reactivation campaigns for recently dormant users',
    'Create channel-level guardrails tied to payback period targets',
    'Reduce top-of-funnel spend and optimize signup-to-value velocity',
    'Run geo-specific experiments before global campaign rollout',
    'Test pricing and messaging bundles for the highest-LTV segments',
    'Rebalance growth roadmap toward retention-led expansion levers',
  ],
  strategy: [
    'Commit to a single thesis with explicit kill criteria',
    'Place a bounded option bet while protecting core cash flow',
    'Delay expansion until one critical assumption is validated',
    'Re-scope the bet to a wedge market before broader rollout',
    'Protect optionality by staging decisions at fixed review gates',
    'Sequence the strategy into reversible and irreversible commitments',
    'Set downside triggers before increasing strategic exposure',
    'Narrow focus to one region before multi-market execution',
    'Trade near-term growth for higher confidence in core unit economics',
    'Reframe the bet around one customer segment with strongest pull',
    'Pause adjacent initiatives to protect the primary strategic thesis',
    'Build a contingency path if adoption misses early signal thresholds',
  ],
  leadership: [
    'Set one accountable owner and publish weekly decision cadence',
    'Run a targeted calibration loop before irreversible decisions',
    'Address expectation gaps directly with a 30-day operating plan',
    'Protect hiring/performance bar despite short-term pressure',
    'Reassign responsibilities to reduce decision bottlenecks',
    'Codify decision rights to reduce escalation churn',
    'Pair underperforming managers with explicit coaching milestones',
    'Reset team goals around one shared execution principle',
    'Create a weekly trust-and-delivery review with clear owners',
    'Address role ambiguity before adding headcount',
    'Rebalance senior attention toward highest-friction team interfaces',
    'Set behavioral norms and tie them to performance feedback cycles',
  ],
  mixed: [
    'Set a shared north-star metric and one counter-metric',
    'Run two time-boxed bets with explicit ownership boundaries',
    'Cut one conflicting priority to restore focus',
    'Sequence execution into 2-week checkpoints with kill-rules',
    'Publish a cross-functional decision memo with owners and deadlines',
    'Define an operating contract across teams for the next 30 days',
    'Escalate only decisions that violate agreed guardrails',
    'Reduce scope to one critical path and defer non-essential asks',
    'Create a red-team review before committing additional resources',
    'Align product, GTM, and ops on one measurable success condition',
    'Use a weekly risk ledger to force explicit trade-off decisions',
    'Assign one integrator role to unblock cross-functional dependencies',
  ],
}

const impactTemplatesByTrack = {
  product: [
    'You reduced ambiguity around product risk before scaling effort.',
    'You chose a product-quality signal over a purely optics-driven move.',
    'You focused the team on one product truth instead of parallel debates.',
  ],
  growth: [
    'You optimized for compounding growth quality, not just activity volume.',
    'You created a clearer growth learning loop for the next cycle.',
    'You traded short-term certainty for stronger growth signal quality.',
  ],
  strategy: [
    'You made the strategic bet size explicit instead of drifting into it.',
    'You constrained downside while preserving room to learn.',
    'You clarified the strategic thesis the team should execute against.',
  ],
  leadership: [
    'You created clearer ownership and expectations across the team.',
    'You reduced coordination drag by defining a single operating stance.',
    'You made people implications explicit, not just delivery implications.',
  ],
  mixed: [
    'You turned a noisy situation into a sharper operating direction.',
    'You picked a concrete trade-off instead of deferring the hard call.',
    'You narrowed the decision space so execution can move faster.',
  ],
}

const tradeoffTemplatesByTrack = {
  product: [
    'This improves learning speed, but can defer visible wins stakeholders expect now.',
    'This protects product integrity, but may feel slower to teams pushing immediate output.',
    'This increases clarity, but raises pressure on execution discipline in the next sprint.',
  ],
  growth: [
    'This can improve efficiency, but may soften headline growth in the short term.',
    'This creates cleaner demand signal, but requires stronger cross-team coordination.',
    'This protects long-term growth quality, but can look conservative in weekly reviews.',
  ],
  strategy: [
    'This limits downside exposure, but may under-capture upside if the market moves fast.',
    'This protects optionality, but can feel less decisive to stakeholders seeking certainty.',
    'This sharpens strategic focus, but increases risk if the core assumption is wrong.',
  ],
  leadership: [
    'This creates accountability, but may surface short-term friction in team dynamics.',
    'This improves alignment, but requires consistent follow-through from leadership.',
    'This can raise team trust, but slows decisions if escalation paths are unclear.',
  ],
  mixed: [
    'This restores focus, but leaves less room for parallel bets.',
    'This improves execution coherence, but narrows experimentation capacity.',
    'This raises decision quality, but demands stricter operating cadence.',
  ],
}

const repeatedTemplatesByTrack = {
  product: [
    'If repeated, this builds a culture of evidence-led product calls.',
    'If repeated, teams get faster at separating user signal from internal noise.',
    'If repeated, roadmap choices become clearer and less political.',
  ],
  growth: [
    'If repeated, growth execution compounds around higher-quality signals.',
    'If repeated, the team becomes better at stopping low-leverage growth work early.',
    'If repeated, channel and product decisions stay better synchronized.',
  ],
  strategy: [
    'If repeated, strategic decisions become more testable and less narrative-driven.',
    'If repeated, the org gets better at balancing conviction with optionality.',
    'If repeated, large bets are reviewed with clearer assumptions and triggers.',
  ],
  leadership: [
    'If repeated, team trust improves through consistent decision mechanics.',
    'If repeated, the org learns faster because ownership and reviews stay explicit.',
    'If repeated, performance conversations become clearer and fairer.',
  ],
  mixed: [
    'If repeated, cross-functional execution gets materially more predictable.',
    'If repeated, teams spend less time debating and more time shipping.',
    'If repeated, decision quality improves even under shifting constraints.',
  ],
}

const operatorLineTemplatesByTrack = {
  product: [
    'Top product operators anchor calls in user evidence, then sequence execution tightly.',
    'Strong PM leaders isolate the core product risk before expanding scope.',
    'Experienced product teams make one clear bet, then measure it brutally.',
  ],
  growth: [
    'Great growth operators protect signal quality and kill weak loops quickly.',
    'High-performing growth teams pair channel bets with retention discipline.',
    'Experienced growth leaders prioritize repeatable loops over vanity spikes.',
  ],
  strategy: [
    'Strong strategists define explicit assumptions, triggers, and downside plans up front.',
    'Top operators stage major bets and review them against real signal, not narratives.',
    'Experienced strategy teams make conviction visible and reversibility explicit.',
  ],
  leadership: [
    'Strong leaders clarify ownership and operating cadence before pressure compounds.',
    'Top leadership teams reduce ambiguity by naming decision rights early.',
    'Experienced leaders align people systems with business priorities, not slogans.',
  ],
  mixed: [
    'Strong operators simplify decision surfaces so teams can execute under pressure.',
    'Top cross-functional leaders turn conflicting goals into explicit operating rules.',
    'Experienced teams keep execution moving by making trade-offs legible to everyone.',
  ],
}

const whatTheyDidTemplatesByTrack = {
  product: [
    ['Defined the key user problem precisely', 'Sequenced one focused fix', 'Reviewed outcomes against product signal'],
    ['Narrowed to one leverage point', 'Aligned design and engineering on scope', 'Measured downstream retention impact'],
    ['Validated assumptions with user evidence', 'Set tight success criteria', 'Adjusted roadmap based on observed behavior'],
  ],
  growth: [
    ['Prioritized one measurable growth loop', 'Set clear spend and stop rules', 'Reallocated budget based on cohort quality'],
    ['Separated acquisition from retention effects', 'Focused on highest-intent segments', 'Scaled only what improved unit economics'],
    ['Time-boxed growth experiments', 'Tracked lagging and leading signals', 'Killed low-leverage channels quickly'],
  ],
  strategy: [
    ['Made assumptions explicit', 'Set decision checkpoints', 'Adjusted bet size as signal changed'],
    ['Defined downside boundaries', 'Protected core execution', 'Revisited thesis with fresh evidence'],
    ['Staged the commitment', 'Named kill criteria early', 'Aligned leadership on one strategic narrative'],
  ],
  leadership: [
    ['Clarified ownership and interfaces', 'Set a weekly decision cadence', 'Resolved conflicts at the right level'],
    ['Named behavioral expectations', 'Linked accountability to outcomes', 'Rebalanced load across the team'],
    ['Aligned incentives and priorities', 'Reduced escalation ambiguity', 'Reviewed team health alongside delivery'],
  ],
  mixed: [
    ['Chose one operating priority', 'Made trade-offs explicit across teams', 'Tracked execution against clear checkpoints'],
    ['Cut conflicting workstreams', 'Defined owners and timelines', 'Escalated only unresolved high-risk decisions'],
    ['Created a shared decision memo', 'Established review rhythm', 'Adjusted quickly to new constraints'],
  ],
}

const takeawayTemplatesByTrack = {
  product: [
    'Product leverage comes from clear signal, then disciplined execution.',
    'Clarity before scale prevents expensive product drift.',
    'One sharp product decision beats three hedged ones.',
  ],
  growth: [
    'Compounding growth follows signal quality, not activity volume.',
    'Efficient growth is built, not wished into existence.',
    'Sustainable growth is a sequencing problem, not a sprint.',
  ],
  strategy: [
    'Great strategy is explicit trade-offs plus explicit triggers.',
    'Bet sizing matters as much as bet selection.',
    'Strategic clarity compounds when reversibility is named early.',
  ],
  leadership: [
    'Leadership quality shows up in decision mechanics under pressure.',
    'Trust compounds when ownership and expectations stay clear.',
    'People systems are strategy execution in disguise.',
  ],
  mixed: [
    'Operating clarity is the multiplier in messy environments.',
    'Trade-offs become execution only when owners are explicit.',
    'Pressure rewards clarity more than complexity.',
  ],
}

function makeChoice(track, theme, roundNum, slot, slug, usedLabels) {
  const pool = choicePoolsByTrack[track] ?? choicePoolsByTrack.mixed
  const label = pickDistinct(pool, `${slug}:${track}:r${roundNum}:${slot}`, usedLabels)
  usedLabels.add(label)
  const weights = [
    { speedVsDepth: 0.25, shortVsLong: 0.15, riskVsConviction: 0.1 },
    { speedVsDepth: -0.2, shortVsLong: -0.2, riskVsConviction: 0.05 },
    { speedVsDepth: 0.05, shortVsLong: 0.05, riskVsConviction: 0.25 },
  ][slot]
  const ids = ['a', 'b', 'c']
  const cleanedTheme = String(theme).replace(/[^a-z0-9\s-]/gi, ' ').replace(/\s+/g, ' ').trim()
  const labelKeywords = String(label)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4)
    .join(' ')
  const hintSeeds = {
    product: 'product decision user friction onboarding retention diagnosis',
    growth: 'growth loop cac ltv retention acquisition channel experiment',
    strategy: 'strategy bet optionality downside scenario timing conviction',
    leadership: 'leadership hiring ownership trust accountability team conflict',
    mixed: 'cross-functional tradeoff execution constraint prioritization alignment',
  }
  const baseHint = hintSeeds[track] ?? hintSeeds.mixed

  function stripPrefix(s, prefix) {
    return String(s).replace(new RegExp(`^${prefix}\\s*:\\s*`, 'i'), '').trim()
  }

  const layer1 = stripPrefix(
    pick(impactTemplatesByTrack[track] ?? impactTemplatesByTrack.mixed, `${slug}:${track}:impact:r${roundNum}:${slot}`),
    'Immediate impact'
  )
  const layer2 = stripPrefix(
    pick(tradeoffTemplatesByTrack[track] ?? tradeoffTemplatesByTrack.mixed, `${slug}:${track}:tradeoff:r${roundNum}:${slot}`),
    'Trade-off'
  )
  const layer3 = stripPrefix(
    pick(repeatedTemplatesByTrack[track] ?? repeatedTemplatesByTrack.mixed, `${slug}:${track}:repeat:r${roundNum}:${slot}`),
    'If repeated'
  )

  return {
    id: ids[slot],
    label: `${label} for "${theme}"`,
    feedback: {
      layer1,
      layer2,
      layer3,
    },
    layer4_static: {
      headline: 'How real operators approached this',
      operatorLine: pick(operatorLineTemplatesByTrack[track] ?? operatorLineTemplatesByTrack.mixed, `${slug}:${track}:operator:r${roundNum}:${slot}`),
      whatTheyDid: pick(whatTheyDidTemplatesByTrack[track] ?? whatTheyDidTemplatesByTrack.mixed, `${slug}:${track}:what:r${roundNum}:${slot}`),
      impact: ['Faster alignment', 'Cleaner accountability'],
      videoUrl: null,
      takeaway: pick(takeawayTemplatesByTrack[track] ?? takeawayTemplatesByTrack.mixed, `${slug}:${track}:takeaway:r${roundNum}:${slot}`),
    },
    profileWeights: weights,
    citationQueryHint: `${baseHint} ${cleanedTheme} ${labelKeywords} round-${roundNum} operator-case`,
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
    const usedLabels = new Set()

    for (let r = 2; r <= 5; r += 1) {
      const promptTemplate = pick(trackPrompts[r], `${sim.slug}:${track}:prompt:r${r}`)
      const prompt = promptTemplate.replaceAll('{theme}', theme)
      const choices = [0, 1, 2].map((slot) => makeChoice(track, theme, r, slot, sim.slug, usedLabels))
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

