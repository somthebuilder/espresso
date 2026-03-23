import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  const supabase = createServerSupabase()

  const { data, error } = await supabase
    .from('simulation_definitions')
    .select(
      'id, slug, track, title, teaser, cover_emoji, rounds, estimated_minutes, published, display_order'
    )
    .eq('id', id)
    .eq('published', true)
    .maybeSingle()

  if (error) {
    console.error('[simulator/[id]]', error)
    return NextResponse.json({ error: 'Failed to load simulation' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(
    data,
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
  )
}
