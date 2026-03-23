'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SimulatorTrack } from '@/lib/simulator/types'

type ListItem = {
  id: string
  slug: string
  track: SimulatorTrack
  title: string
  teaser: string | null
  cover_emoji: string | null
  estimated_minutes: number
  display_order: number
}

type Quota = {
  completionsToday: number
  limit: number
  remaining: number
}

const TRACKS: { id: SimulatorTrack | 'all'; label: string }[] = [
  { id: 'all', label: 'All Scenarios' },
  { id: 'product', label: 'Product Decisions' },
  { id: 'growth', label: 'Growth & Acquisition' },
  { id: 'strategy', label: 'Strategy & Bets' },
  { id: 'leadership', label: 'Leadership & Teams' },
  { id: 'mixed', label: 'Mixed Challenge' },
]

const TRACK_BADGE_LABELS: Record<SimulatorTrack, string> = {
  product: 'PRODUCT',
  growth: 'GROWTH',
  strategy: 'STRATEGY',
  leadership: 'LEADERSHIP',
  mixed: 'MIXED',
}

const TRACK_TENSION_LINES: Record<SimulatorTrack, string[]> = {
  product: [
    'Most teams optimize the wrong thing first.',
    'The fastest fix can hide the real product risk.',
    'This is where good PM instincts get tested.',
  ],
  growth: [
    'One move can unlock growth, another can burn months.',
    'The obvious growth lever is rarely the durable one.',
    'This call separates experimentation from thrash.',
  ],
  strategy: [
    'The wrong bet here compounds quietly.',
    'Small strategic calls can reshape the whole roadmap.',
    'This is where conviction meets uncertainty.',
  ],
  leadership: [
    'This decision can strengthen trust or drain it.',
    'What you reward here shapes team behavior fast.',
    'People outcomes and business outcomes collide here.',
  ],
  mixed: [
    'Competing priorities make this harder than it looks.',
    'There is no clean win - only sharper tradeoffs.',
    'Context shifts fast, your principles cannot.',
  ],
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function cardTeaser(sim: ListItem): string | null {
  if (sim.title === 'The Activation Cliff') {
    return 'Activation just dropped 40% and every team has a different "quick fix." Users are leaving, and you still do not know why.'
  }
  if (sim.title === 'Growth Without the Spend') {
    return 'Your best acquisition channel just died, the board still expects growth, and nothing in your product changed. What do you fix first?'
  }
  return sim.teaser
}

function cardTension(sim: ListItem): string {
  const options = TRACK_TENSION_LINES[sim.track]
  return options[hashString(sim.slug || sim.id) % options.length]
}

function cardMinutes(sim: ListItem): number {
  const minutes = Number.isFinite(sim.estimated_minutes) ? sim.estimated_minutes : 3
  return Math.max(2, Math.min(8, Math.round(minutes)))
}

export default function SimulatorHubClient({ podcastSlug }: { podcastSlug: string }) {
  const router = useRouter()
  const [items, setItems] = useState<ListItem[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [track, setTrack] = useState<SimulatorTrack | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listRes, quotaRes] = await Promise.all([
        fetch(`/api/simulator/list?podcastSlug=${encodeURIComponent(podcastSlug)}`),
        fetch('/api/simulator/quota'),
      ])
      if (!listRes.ok) {
        const j = await listRes.json().catch(() => ({}))
        throw new Error(typeof j.error === 'string' ? j.error : 'Could not load simulations')
      }
      const listJson = (await listRes.json()) as { items: ListItem[] }
      setItems(listJson.items ?? [])

      if (quotaRes.ok) {
        const q = (await quotaRes.json()) as Quota
        setQuota(q)
      } else {
        setQuota(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [podcastSlug])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (track === 'all') return items
    return items.filter((i) => i.track === track)
  }, [items, track])

  async function startSimulation(simulationId: string) {
    setStartingId(simulationId)
    setError(null)
    try {
      const res = await fetch('/api/simulator/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulationId }),
      })
      const raw = await res.text()
      let j: { error?: string; details?: string; run?: { id?: string } } = {}
      try {
        j = raw ? (JSON.parse(raw) as typeof j) : {}
      } catch {
        j = {}
      }
      if (!res.ok) {
        const msg =
          typeof j.error === 'string'
            ? j.error
            : raw?.slice(0, 200) || `Request failed (${res.status})`
        const detail = typeof j.details === 'string' ? ` ${j.details}` : ''
        throw new Error(`${msg}${detail}`)
      }
      const runId = j.run?.id as string | undefined
      if (!runId) throw new Error('Invalid response from server (missing run id).')
      router.push(`/${podcastSlug}/simulator/run/${runId}`)
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message === 'Failed to fetch'
            ? 'Network error — is the dev server running? If it is, check the API route logs.'
            : e.message
          : 'Could not start'
      setError(message)
      if (process.env.NODE_ENV === 'development') {
        console.error('[simulator] startSimulation failed', e)
      }
    } finally {
      setStartingId(null)
    }
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-8 md:py-10">
      <p className="text-sm text-charcoal-500 mb-2">
        <Link href={`/${podcastSlug}`} className="hover:text-accent-600">
          ← Back to podcast
        </Link>
      </p>
      <h1 className="text-2xl md:text-3xl font-serif text-charcoal-900 mb-2">Operator Simulator</h1>
      <p className="text-sm md:text-base text-charcoal-600 max-w-2xl leading-relaxed mb-6">
        Train your decision-making like a top operator.
      </p>

      {quota && (
        <div className="mb-8 rounded-xl border border-charcoal-200 bg-white/80 px-4 py-3 text-sm text-charcoal-700 flex flex-wrap gap-4 items-center justify-between">
          <span>
            Today&apos;s runs:{' '}
            <strong>
              {quota.completionsToday} / {quota.limit}
            </strong>
            <span className="block text-xs text-charcoal-500 mt-1">
              Build your operator profile through repeated decisions.
            </span>
          </span>
          <span className={quota.remaining === 0 ? 'text-accent-600 font-medium' : ''}>
            {quota.remaining === 0
              ? 'Daily limit reached. You can continue practicing, but submissions reopen tomorrow (UTC).'
              : `${quota.remaining} attempt${quota.remaining === 1 ? '' : 's'} left today`}
          </span>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="flex flex-wrap gap-2 mb-8">
        {TRACKS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTrack(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              track === t.id
                ? 'bg-charcoal-900 text-white border-charcoal-900'
                : 'bg-white text-charcoal-600 border-charcoal-200 hover:border-charcoal-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-charcoal-500 text-sm">Loading simulations…</p>
      ) : filtered.length === 0 ? (
        <p className="text-charcoal-600 text-sm">No simulations match this filter. Try a different track.</p>
      ) : (
        <div>
          <p className="text-sm text-charcoal-600 mb-4">
            Pick a scenario. No right answers - only tradeoffs that reveal how you think.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((sim) => (
            <article
              key={sim.id}
              className="group rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm transition-colors h-full flex flex-col hover:border-accent-300"
            >
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {sim.cover_emoji && <span className="text-xl" aria-hidden>{sim.cover_emoji}</span>}
                    <span className="text-xs uppercase tracking-wide text-charcoal-500 font-medium">
                      {TRACK_BADGE_LABELS[sim.track]}
                    </span>
                    <span className="text-xs text-charcoal-400">· 5 decisions · ~{cardMinutes(sim)} min</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-serif text-charcoal-900 mb-2">{sim.title}</h2>
                  {cardTeaser(sim) && (
                    <p className="text-charcoal-600 text-sm leading-relaxed">{cardTeaser(sim)}</p>
                  )}
                  <p className="text-xs text-charcoal-500 mt-2">{cardTension(sim)}</p>
                </div>
                <div className="mt-auto pt-3 border-t border-charcoal-100 opacity-0 translate-y-1 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto">
                <button
                  type="button"
                  onClick={() => startSimulation(sim.id)}
                  disabled={!!startingId}
                  className="w-full rounded-md border border-accent-600 bg-transparent px-4 py-2 text-sm font-medium text-accent-600 transition-colors hover:bg-[#FFF4ED] group-hover:bg-[#FFF4ED] group-hover:text-accent-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {startingId === sim.id ? 'Starting…' : 'Step In'}
                </button>
                </div>
              </div>
            </article>
          ))}
          </div>
        </div>
      )}
    </main>
  )
}
