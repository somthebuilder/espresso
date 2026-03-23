import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

function loadEnv(frontendDir) {
  dotenv.config({ path: path.join(frontendDir, '.env.local') })
  dotenv.config({ path: path.join(frontendDir, '../.env') })
}

function buildLayer4(operatorLine, takeaway) {
  return {
    headline: 'How real operators approached this',
    operatorLine,
    whatTheyDid: ['Defined one owner', 'Set a clear success metric', 'Reviewed weekly'],
    impact: ['Faster alignment', 'Cleaner decisions'],
    videoUrl: null,
    takeaway,
  }
}

function buildChoices(theme, roundLabel, track) {
  const common = {
    product: [
      `Prioritize a short-cycle product test for "${theme}"`,
      `Protect core UX quality and ship a smaller scoped fix`,
      `Run a cross-functional sprint to resolve "${theme}" trade-offs`,
    ],
    growth: [
      `Push a measurable growth experiment tied to "${theme}"`,
      `Improve retention/lifecycle before adding more acquisition spend`,
      `Diversify channels with strict kill criteria on "${theme}"`,
    ],
    strategy: [
      `Commit to a focused thesis for "${theme}" with stop-rules`,
      `Place a smaller option bet and preserve downside protection`,
      `Delay commitment until one key assumption is validated`,
    ],
    leadership: [
      `Set explicit ownership and expectations around "${theme}"`,
      `Run a short calibration loop before committing`,
      `Protect bar/standards even if progress slows short-term`,
    ],
    mixed: [
      `Choose one operating metric and align all teams around it`,
      `Time-box two small bets with explicit review gates`,
      `Cut one conflicting priority to protect focus on "${theme}"`,
    ],
  }

  const labels = common[track] ?? common.mixed
  const hints = [
    `${track} ${theme} ${roundLabel} decision owner operating cadence`,
    `${track} ${theme} ${roundLabel} tradeoff long term vs short term`,
    `${track} ${theme} ${roundLabel} focus prioritization under pressure`,
  ]

  return labels.map((label, idx) => {
    const id = ['a', 'b', 'c'][idx]
    const weightSets = [
      { speedVsDepth: 0.2, shortVsLong: 0.1, riskVsConviction: 0.15 },
      { speedVsDepth: -0.2, shortVsLong: -0.2, riskVsConviction: 0.05 },
      { speedVsDepth: 0.05, shortVsLong: 0.05, riskVsConviction: 0.2 },
    ]
    return {
      id,
      label,
      feedback: {
        layer1: 'You made a clear operating choice under pressure.',
        layer2: 'Trade-off: this optimizes one axis while increasing risk on another.',
        layer3: 'If repeated, this pattern shapes your operating style and team behavior.',
      },
      layer4_static: buildLayer4(
        'Strong operators make trade-offs explicit and review them on cadence.',
        'Good decisions come from clear choices and disciplined follow-through.'
      ),
      profileWeights: weightSets[idx],
      citationQueryHint: hints[idx],
    }
  })
}

function roundPrompt(track, theme, roundNumber) {
  const map = {
    2: `Round 2 - Prioritization: You can only back one path for "${theme}" this sprint. Which path do you choose?`,
    3: `Round 3 - Stakeholder tension: Teams disagree on "${theme}" direction. How do you reset execution?`,
    4: `Round 4 - Constraint shock: Capacity tightens but "${theme}" expectations stay high. What is your move?`,
    5: `Round 5 - Final commitment: Which operating principle do you commit to for "${theme}" next month?`,
  }
  return map[roundNumber] ?? `Round ${roundNumber}: Decision on "${theme}".`
}

async function main() {
  const frontendDir = process.cwd()
  loadEnv(frontendDir)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE URL or service key.')
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: podcast } = await supabase
    .from('podcasts')
    .select('id')
    .eq('slug', 'lennys-podcast')
    .maybeSingle()
  if (!podcast?.id) throw new Error('Podcast lennys-podcast not found.')

  const { data: sims, error } = await supabase
    .from('simulation_definitions')
    .select('id, track, title, rounds')
    .eq('podcast_id', podcast.id)
    .order('display_order', { ascending: true })
  if (error) throw new Error(error.message)

  let patched = 0
  for (const sim of sims ?? []) {
    const rounds = Array.isArray(sim.rounds) ? sim.rounds : []
    if (rounds.length >= 5) continue

    const theme = String(sim.title).includes(':') ? String(sim.title).split(':').slice(1).join(':').trim() : sim.title
    const out = [...rounds]
    for (let n = rounds.length + 1; n <= 5; n += 1) {
      out.push({
        prompt: roundPrompt(sim.track, theme, n),
        choices: buildChoices(theme, `round ${n}`, sim.track),
      })
    }

    const { error: updErr } = await supabase
      .from('simulation_definitions')
      .update({ rounds: out, updated_at: new Date().toISOString() })
      .eq('id', sim.id)
    if (updErr) throw new Error(`Update failed for ${sim.id}: ${updErr.message}`)
    patched += 1
  }

  console.log(`Expanded ${patched} simulations to 5 rounds where needed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

