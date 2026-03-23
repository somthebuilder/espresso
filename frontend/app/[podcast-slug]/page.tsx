import Header from '@/components/Header'
import PodcastTabs from '@/components/PodcastTabs'
import { getConcepts } from '@/lib/api/concepts'
import { getDryRunPreview } from '@/lib/api/preview'
import type { Concept } from '@/lib/types/rag'

// Revalidate every 5 minutes — balances freshness with speed
export const revalidate = 300

type PodcastPageProps = {
  params: { 'podcast-slug': string }
  searchParams?: { [key: string]: string | string[] | undefined }
}

function getParamInt(
  value: string | string[] | undefined,
  fallback: number,
  min: number,
  max: number
) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

function isPreviewEnabled(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === '1' || raw === 'true' || raw === 'yes'
}

type VisibleTab = 'concepts' | 'chat'

function getInitialTab(value: string | string[] | undefined): VisibleTab | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  // Legacy ?tab=insights URLs → concepts
  if (raw === 'insights' || raw === 'concepts') return 'concepts'
  if (raw === 'chat') return 'chat'
  return undefined
}

export default async function PodcastPage({ params, searchParams }: PodcastPageProps) {
  const slug = params['podcast-slug']
  const previewEnabled = isPreviewEnabled(searchParams?.preview)
  const initialTab = getInitialTab(searchParams?.tab)
  const sampleChunks = getParamInt(searchParams?.sampleChunks, 240, 60, 500)
  const conceptCount = getParamInt(searchParams?.conceptCount, 10, 4, 24)
  const insightCount = getParamInt(searchParams?.insightCount, 10, 4, 24)
  let concepts: Concept[] = []
  let conceptsTotal = 0
  let previewMeta: Awaited<ReturnType<typeof getDryRunPreview>>['meta'] | null = null
  let previewError: string | null = null

  if (previewEnabled) {
    try {
      const preview = await getDryRunPreview(slug, { sampleChunks, conceptCount, insightCount })
      concepts = preview.concepts
      previewMeta = preview.meta
    } catch (error) {
      previewError = error instanceof Error ? error.message : 'Preview mode failed'
      concepts = await getConcepts(slug)
      conceptsTotal = concepts.length
    }
  } else {
    concepts = await getConcepts(slug)
    conceptsTotal = concepts.length
  }

  if (previewEnabled) {
    conceptsTotal = concepts.length
  }
  const graphHref = initialTab ? `/${slug}/graph?tab=${encodeURIComponent(initialTab)}` : `/${slug}/graph`

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Header
        themeGraphHref={
          slug === 'lennys-podcast' ? graphHref : undefined
        }
        simulatorHref={
          slug === 'lennys-podcast' ? `/${slug}/simulator` : undefined
        }
      />
      {previewEnabled && (
        <div className="border-b border-accent-200 bg-accent-50/60">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 text-xs text-charcoal-700 flex flex-wrap gap-3 items-center">
            <span className="font-semibold">Preview Mode (dry run)</span>
            {previewMeta && (
              <>
                <span>model: {previewMeta.modelUsed ?? 'unknown'}</span>
                <span>concepts: {previewMeta.conceptsGenerated}</span>
                <span>insights: {previewMeta.insightsGenerated}</span>
                <span>raw: {previewMeta.rawConceptCount}/{previewMeta.rawInsightCount}</span>
              </>
            )}
            {previewError && <span className="text-red-700">fallback to saved data: {previewError}</span>}
          </div>
        </div>
      )}
      <PodcastTabs
        podcastSlug={slug}
        concepts={concepts}
        conceptsTotal={conceptsTotal}
        previewMode={previewEnabled}
        initialTab={initialTab}
      />
    </div>
  )
}
