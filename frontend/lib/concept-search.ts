import type { Concept } from '@/lib/types/rag'

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreConcept(concept: Concept, terms: string[]): number {
  const title = normalize(concept.title)
  const summary = normalize(concept.summary || concept.body || '')
  const meta = normalize([concept.category, concept.theme_label].filter(Boolean).join(' '))
  const guests = normalize(
    (concept.references ?? [])
      .map((r) => `${r.guest_name ?? ''} ${r.episode_title ?? ''}`)
      .join(' ')
  )

  let score = 0
  for (const term of terms) {
    if (title.includes(term)) score += title.startsWith(term) ? 12 : 10
    else if (guests.includes(term)) score += 6
    else if (meta.includes(term)) score += 4
    else if (summary.includes(term)) score += 2
    else return 0
  }
  return score
}

/** Every term must match somewhere; title matches rank above guest, category and summary matches. */
export function searchConcepts(concepts: Concept[], query: string): Concept[] {
  const terms = normalize(query).split(' ').filter(Boolean)
  if (terms.length === 0) return concepts

  return concepts
    .map((concept, index) => ({ concept, index, score: scoreConcept(concept, terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.concept)
}
