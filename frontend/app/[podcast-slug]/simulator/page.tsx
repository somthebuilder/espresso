import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import SimulatorHubClient from '@/components/simulator/SimulatorHubClient'

const LENNY = 'lennys-podcast'

type PageProps = {
  params: { 'podcast-slug': string }
}

export default function SimulatorPage({ params }: PageProps) {
  const slug = params['podcast-slug']
  if (slug !== LENNY) {
    notFound()
  }

  const graphHref = `/${slug}/graph`

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Header themeGraphHref={graphHref} simulatorHref={`/${slug}/simulator`} />
      <SimulatorHubClient podcastSlug={slug} />
    </div>
  )
}
