import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const podcastSlug = request.nextUrl.searchParams.get('podcastSlug')?.trim() || 'lennys-podcast'
  const supabase = createServerSupabase()

  const { data: podcast, error: pErr } = await supabase
    .from('podcasts')
    .select('id')
    .eq('slug', podcastSlug)
    .maybeSingle()
  if (pErr || !podcast) {
    return NextResponse.json({ items: [], error: 'Podcast not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('simulation_definitions')
    .select('id, slug, track, title, teaser, cover_emoji, estimated_minutes, display_order')
    .eq('podcast_id', podcast.id)
    .eq('published', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[simulator/list]', error)
    return NextResponse.json({ error: 'Failed to load simulations' }, { status: 500 })
  }

  return NextResponse.json(
    { items: data ?? [] },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
  )
}
