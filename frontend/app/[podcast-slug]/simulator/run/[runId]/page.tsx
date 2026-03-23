import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import SimulatorRunClient from '@/components/simulator/SimulatorRunClient'

const LENNY = 'lennys-podcast'

type PageProps = {
  params: { 'podcast-slug': string; runId: string }
}

export default function SimulatorRunPage({ params }: PageProps) {
  const slug = params['podcast-slug']
  const runId = params.runId
  if (slug !== LENNY || !runId) {
    notFound()
  }

  const graphHref = `/${slug}/graph`

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Header themeGraphHref={graphHref} simulatorHref={`/${slug}/simulator`} />
      <SimulatorRunClient podcastSlug={slug} runId={runId} />
    </div>
  )
}
