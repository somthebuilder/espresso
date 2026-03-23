import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleSupabase, SERVICE_ROLE_ENV_HINT } from '@/lib/supabase-server'
import { getSimulatorUserKey } from '@/lib/simulator/server-user-key'
import type { RunAnswer } from '@/lib/simulator/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _request: NextRequest,
  { params }: { params: { runId: string } }
) {
  const runId = params.runId
  if (!runId) return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
  const userKey = await getSimulatorUserKey(_request)
  const supabase = getServiceRoleSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Simulator requires the Supabase service role key on the server.', details: SERVICE_ROLE_ENV_HINT },
      { status: 503 }
    )
  }

  const { data, error } = await supabase
    .from('simulation_runs')
    .select(
      'id, simulation_id, status, current_round_index, answers, llm_summary, llm_profile, llm_citations, copilot_input, copilot_output, created_at, completed_at'
    )
    .eq('id', runId)
    .eq('user_key', userKey)
    .maybeSingle()

  if (error) {
    console.error('[simulator/runs GET]', error)
    return NextResponse.json({ error: 'Failed to load run' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(
    data,
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  const runId = params.runId
  if (!runId) return NextResponse.json({ error: 'Missing runId' }, { status: 400 })

  let body: {
    answers?: unknown
    currentRoundIndex?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userKey = await getSimulatorUserKey(request)
  const supabase = getServiceRoleSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Simulator requires the Supabase service role key on the server.', details: SERVICE_ROLE_ENV_HINT },
      { status: 503 }
    )
  }

  const { data: existing, error: exErr } = await supabase
    .from('simulation_runs')
    .select('id, status, user_key')
    .eq('id', runId)
    .maybeSingle()
  if (exErr || !existing || existing.user_key !== userKey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (existing.status === 'completed') {
    return NextResponse.json({ error: 'Run already completed' }, { status: 400 })
  }

  const answers = Array.isArray(body.answers) ? (body.answers as RunAnswer[]) : undefined
  const currentRoundIndex =
    typeof body.currentRoundIndex === 'number' && Number.isFinite(body.currentRoundIndex)
      ? Math.max(0, Math.floor(body.currentRoundIndex))
      : undefined

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (answers) patch.answers = answers
  if (currentRoundIndex !== undefined) patch.current_round_index = currentRoundIndex

  const { data, error } = await supabase
    .from('simulation_runs')
    .update(patch)
    .eq('id', runId)
    .eq('user_key', userKey)
    .select('id, status, current_round_index, answers, updated_at')
    .single()

  if (error) {
    console.error('[simulator/runs PATCH]', error)
    return NextResponse.json({ error: 'Could not save progress' }, { status: 500 })
  }

  return NextResponse.json({ run: data })
}
