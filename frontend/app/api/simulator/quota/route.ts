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

export async function GET(request: NextRequest) {
  const userKey = await getSimulatorUserKey(request)
  const supabase = getServiceRoleSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Simulator requires the Supabase service role key on the server.', details: SERVICE_ROLE_ENV_HINT },
      { status: 503 }
    )
  }
  const { start, end } = utcDayBounds()

  const { count, error } = await supabase
    .from('simulation_runs')
    .select('*', { count: 'exact', head: true })
    .eq('user_key', userKey)
    .eq('status', 'completed')
    .gte('completed_at', start)
    .lt('completed_at', end)

  if (error) {
    return NextResponse.json({ error: 'Could not load quota' }, { status: 500 })
  }

  const completionsToday = count ?? 0
  const remaining = Math.max(0, SIMULATOR_DAILY_COMPLETION_LIMIT - completionsToday)

  return NextResponse.json({
    completionsToday,
    limit: SIMULATOR_DAILY_COMPLETION_LIMIT,
    remaining,
  })
}
