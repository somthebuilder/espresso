import type { SupabaseClient } from '@supabase/supabase-js'
import { embedForRetrievalQuery } from '@/lib/simulator/embed-query'

/** Aligned with chat: minimum useful similarity; we surface "high" above HIGH_CONFIDENCE */
export const MIN_CITATION_SIMILARITY = 0.35
export const HIGH_CONFIDENCE_SIMILARITY = 0.55

export type InterviewCitation = {
  chunkId: string
  text: string
  similarity: number
  highConfidence: boolean
  guestName: string
  episodeTitle: string
  episodeUrl: string | null
  timestamp: string | null
  segmentType: string | null
  themeId: string | null
}

function appendYouTubeTimestamp(url: string | null, timeStamp: string | null): string | null {
  if (!url) return null
  if (!timeStamp) return url
  const parts = String(timeStamp).split(':').map(Number)
  let secs = 0
  if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2]
  else if (parts.length === 2) secs = parts[0] * 60 + parts[1]
  if (secs <= 0) return url
  const sep = url.includes('?') ? '&' : '?'
  if (url.includes('&t=') || url.includes('?t=')) return url
  return `${url}${sep}t=${secs}`
}

/**
 * Find interview chunks similar to the scenario text (embeddings + match_chunks).
 */
export async function searchInterviewCitations(
  supabase: SupabaseClient,
  queryText: string,
  options: {
    limit?: number
    matchThreshold?: number
  } = {}
): Promise<InterviewCitation[]> {
  const { limit = 8, matchThreshold = 0.0 } = options
  const trimmed = queryText.trim()
  if (!trimmed) return []

  const queryEmbedding = await embedForRetrievalQuery(trimmed.slice(0, 8000))

  const { data: rows, error } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: limit,
    filter_guest_id: null,
    filter_theme_id: null,
    filter_segment_types: ['interview', 'lightning_round'],
  })

  if (error) {
    console.error('[simulator/citation-search] match_chunks', error)
    throw new Error(error.message)
  }

  const chunkRows = (rows ?? []) as Array<{
    chunk_id: string
    text: string
    similarity: number
    guest_id: string
    episode_id: string
    theme_id: string | null
    time_stamp: string | null
    segment_type: string | null
  }>

  if (!chunkRows.length) return []

  const guestIds = [...new Set(chunkRows.map((c) => c.guest_id).filter(Boolean))]
  const episodeIds = [...new Set(chunkRows.map((c) => c.episode_id).filter(Boolean))]

  const [{ data: guestRows }, { data: episodeRows }] = await Promise.all([
    guestIds.length
      ? supabase.from('guests').select('id, full_name').in('id', guestIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    episodeIds.length
      ? supabase.from('episodes').select('id, title, youtube_url').in('id', episodeIds)
      : Promise.resolve({ data: [] as { id: string; title: string; youtube_url: string | null }[] }),
  ])

  const guestMap = new Map((guestRows ?? []).map((g) => [g.id, g.full_name]))
  const episodeMap = new Map(
    (episodeRows ?? []).map((e) => [e.id, { title: e.title, url: e.youtube_url }])
  )

  return chunkRows
    .filter((r) => r.similarity >= MIN_CITATION_SIMILARITY)
    .map((r) => {
      const guestName = r.guest_id ? guestMap.get(r.guest_id) ?? 'Guest' : 'Guest'
      const ep = r.episode_id ? episodeMap.get(r.episode_id) : null
      const episodeTitle = ep?.title ?? 'Episode'
      const rawUrl = ep?.url ?? null
      const episodeUrl = appendYouTubeTimestamp(rawUrl, r.time_stamp)

      return {
        chunkId: r.chunk_id,
        text: r.text,
        similarity: r.similarity,
        highConfidence: r.similarity >= HIGH_CONFIDENCE_SIMILARITY,
        guestName,
        episodeTitle,
        episodeUrl,
        timestamp: r.time_stamp,
        segmentType: r.segment_type,
        themeId: r.theme_id,
      }
    })
}
