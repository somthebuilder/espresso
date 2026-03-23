import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleSupabase, SERVICE_ROLE_ENV_HINT } from '@/lib/supabase-server'
import { getSimulatorUserKey } from '@/lib/simulator/server-user-key'
import { SIMULATOR_DAILY_COMPLETION_LIMIT } from '@/lib/simulator/constants'

function utcDayBounds() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start.getTime() + 86400000)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function POST(request: NextRequest) {
  let body: { simulationId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const simulationId = typeof body.simulationId === 'string' ? body.simulationId.trim() : ''
  if (!simulationId) {
    return NextResponse.json({ error: 'simulationId is required' }, { status: 400 })
  }

  const userKey = await getSimulatorUserKey(request)
  const supabase = getServiceRoleSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Simulator requires the Supabase service role key on the server.', details: SERVICE_ROLE_ENV_HINT },
      { status: 503 }
    )
  }
  const { start, end } = utcDayBounds()

  const { count: completionsToday } = await supabase
    .from('simulation_runs')
    .select('*', { count: 'exact', head: true })
    .eq('user_key', userKey)
    .eq('status', 'completed')
    .gte('completed_at', start)
    .lt('completed_at', end)

  const { data: sim, error: simErr } = await supabase
    .from('simulation_definitions')
    .select('id')
    .eq('id', simulationId)
    .eq('published', true)
    .maybeSingle()
  if (simErr || !sim) {
    return NextResponse.json({ error: 'Simulation not found' }, { status: 404 })
  }

  const { data: run, error: insertErr } = await supabase
    .from('simulation_runs')
    .insert({
      user_key: userKey,
      simulation_id: simulationId,
      status: 'in_progress',
      current_round_index: 0,
      answers: [],
    })
    .select('id, status, current_round_index, answers, created_at')
    .single()

  if (insertErr || !run) {
    console.error('[simulator/runs POST] insert', insertErr)
    const devDetails =
      process.env.NODE_ENV === 'development' && insertErr?.message
        ? insertErr.message
        : undefined
    return NextResponse.json(
      {
        error: 'Could not start run',
        ...(devDetails ? { details: devDetails } : {}),
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    run,
    completionsToday: completionsToday ?? 0,
    limit: SIMULATOR_DAILY_COMPLETION_LIMIT,
  })
}
