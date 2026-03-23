import fs from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

function loadEnv(frontendDir) {
  dotenv.config({ path: path.join(frontendDir, '.env.local') })
  dotenv.config({ path: path.join(frontendDir, '../.env') })
}

function extractJsonArrays(text) {
  const chunks = []
  let start = -1
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '[') {
      if (depth === 0) start = i
      depth += 1
      continue
    }
    if (ch === ']') {
      depth -= 1
      if (depth === 0 && start >= 0) {
        chunks.push(text.slice(start, i + 1))
        start = -1
      }
    }
  }

  return chunks
}

function assertSimulationShape(sim) {
  const requiredTop = [
    'track',
    'slug',
    'title',
    'teaser',
    'cover_emoji',
    'estimated_minutes',
    'published',
    'display_order',
    'rounds',
  ]
  for (const key of requiredTop) {
    if (!(key in sim)) throw new Error(`Missing key "${key}" in slug ${sim.slug ?? '(unknown)'}`)
  }
  if (!Array.isArray(sim.rounds) || sim.rounds.length === 0) {
    throw new Error(`Invalid rounds for slug ${sim.slug}`)
  }
  for (const round of sim.rounds) {
    if (!round.prompt || !Array.isArray(round.choices) || round.choices.length !== 3) {
      throw new Error(`Invalid round shape in slug ${sim.slug}`)
    }
    const ids = round.choices.map((c) => c.id).sort().join(',')
    if (ids !== 'a,b,c') {
      throw new Error(`Choice ids must be a,b,c in slug ${sim.slug}`)
    }
  }
}

async function main() {
  const frontendDir = process.cwd()
  loadEnv(frontendDir)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE URL or service role key in env.')
  }

  const filePath = path.join(frontendDir, '../migrations/simulationjson.md')
  const raw = await fs.readFile(filePath, 'utf8')
  const arrays = extractJsonArrays(raw)
  if (arrays.length === 0) throw new Error('No JSON arrays found in simulationjson.md')

  const simulations = []
  for (const chunk of arrays) {
    const parsed = JSON.parse(chunk)
    if (!Array.isArray(parsed)) throw new Error('Parsed batch is not an array')
    for (const sim of parsed) {
      assertSimulationShape(sim)
      simulations.push(sim)
    }
  }

  // Ensure no duplicate slugs
  const slugSet = new Set()
  for (const sim of simulations) {
    if (slugSet.has(sim.slug)) throw new Error(`Duplicate slug found: ${sim.slug}`)
    slugSet.add(sim.slug)
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: podcast, error: podcastErr } = await supabase
    .from('podcasts')
    .select('id')
    .eq('slug', 'lennys-podcast')
    .maybeSingle()
  if (podcastErr || !podcast) {
    throw new Error(`Could not find lennys-podcast: ${podcastErr?.message ?? 'not found'}`)
  }

  const { error: delErr } = await supabase.from('simulation_definitions').delete().eq('podcast_id', podcast.id)
  if (delErr) throw new Error(`Delete existing simulations failed: ${delErr.message}`)

  const rows = simulations.map((sim) => ({
    podcast_id: podcast.id,
    slug: sim.slug,
    track: sim.track,
    title: sim.title,
    teaser: sim.teaser,
    cover_emoji: sim.cover_emoji,
    rounds: sim.rounds,
    estimated_minutes: sim.estimated_minutes,
    published: sim.published,
    display_order: sim.display_order,
  }))

  const { error: insErr } = await supabase.from('simulation_definitions').insert(rows)
  if (insErr) throw new Error(`Insert simulations failed: ${insErr.message}`)

  console.log(`Imported ${rows.length} simulations from ${arrays.length} JSON batches.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

