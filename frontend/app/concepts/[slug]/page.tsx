import { permanentRedirect } from 'next/navigation'

/** Legacy URL kept so old shared links still resolve to the podcast-scoped concept page. */
export default function LegacyConceptPage({ params }: { params: { slug: string } }) {
  permanentRedirect(`/lennys-podcast/concepts/${encodeURIComponent(params.slug)}`)
}
