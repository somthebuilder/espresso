'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  CopilotOutput,
  LlmProfile,
  LlmCitationsPayload,
  RunAnswer,
  SimulationDefinitionRow,
  SimulationRunRow,
  SimulatorInterviewCitation,
} from '@/lib/simulator/types'

function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      return v ? `https://www.youtube.com/embed/${v}` : null
    }
  } catch {
    return null
  }
  return null
}

export default function SimulatorRunClient({
  podcastSlug,
  runId,
}: {
  podcastSlug: string
  runId: string
}) {
  const router = useRouter()
  const [run, setRun] = useState<SimulationRunRow | null>(null)
  const [sim, setSim] = useState<SimulationDefinitionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [lastChoiceLabel, setLastChoiceLabel] = useState<string | null>(null)
  const [copilotProblem, setCopilotProblem] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [citationsState, setCitationsState] = useState<{
    loading: boolean
    items: SimulatorInterviewCitation[]
    hasHighConfidence: boolean
    error: string | null
  }>({ loading: false, items: [], hasHighConfidence: false, error: null })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const runRes = await fetch(`/api/simulator/runs/${runId}`)
      if (!runRes.ok) {
        const j = await runRes.json().catch(() => ({}))
        throw new Error(typeof j.error === 'string' ? j.error : 'Run not found')
      }
      const runData = (await runRes.json()) as SimulationRunRow
      setRun(runData)

      const simRes = await fetch(`/api/simulator/${runData.simulation_id}`)
      if (!simRes.ok) {
        const j = await simRes.json().catch(() => ({}))
        throw new Error(typeof j.error === 'string' ? j.error : 'Simulation missing')
      }
      const simData = (await simRes.json()) as SimulationDefinitionRow
      setSim(simData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    load()
  }, [load])

  const rounds = sim?.rounds ?? []
  const answers = (run?.answers as RunAnswer[]) ?? []
  const idx = run?.current_round_index ?? 0

  const lastAnswer = answers.length > 0 ? answers[answers.length - 1] : null

  useEffect(() => {
    if (!showFeedback || !run?.simulation_id || !lastAnswer) {
      setCitationsState({ loading: false, items: [], hasHighConfidence: false, error: null })
      return
    }
    const ac = new AbortController()
    setCitationsState({ loading: true, items: [], hasHighConfidence: false, error: null })
    ;(async () => {
      try {
        const res = await fetch('/api/simulator/citations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId,
            simulationId: run.simulation_id,
            roundIndex: lastAnswer.roundIndex,
            choiceId: lastAnswer.choiceId,
          }),
          signal: ac.signal,
        })
        const j = (await res.json().catch(() => ({}))) as {
          citations?: SimulatorInterviewCitation[]
          hasHighConfidence?: boolean
          error?: string
        }
        if (!res.ok) {
          throw new Error(typeof j.error === 'string' ? j.error : 'Could not load citations')
        }
        setCitationsState({
          loading: false,
          items: j.citations ?? [],
          hasHighConfidence: !!j.hasHighConfidence,
          error: null,
        })
      } catch (e) {
        if (ac.signal.aborted) return
        setCitationsState({
          loading: false,
          items: [],
          hasHighConfidence: false,
          error: e instanceof Error ? e.message : 'Citations unavailable',
        })
      }
    })()
    return () => ac.abort()
  }, [showFeedback, run?.simulation_id, lastAnswer])

  const atSubmitGate = run && run.status !== 'completed' && rounds.length > 0 && idx >= rounds.length

  const currentRound = idx < rounds.length ? rounds[idx] : null

  const profile = run?.llm_profile as LlmProfile | Record<string, unknown> | null | undefined
  const profileOk =
    profile &&
    typeof profile === 'object' &&
    'headline' in profile &&
    typeof (profile as LlmProfile).headline === 'string'
      ? (profile as LlmProfile)
      : null
  const copilotOut = run?.copilot_output as CopilotOutput | null | undefined
  const llmCitations = run?.llm_citations as LlmCitationsPayload | null | undefined

  const progressLabel = useMemo(() => {
    if (!rounds.length) return ''
    return `Round ${Math.min(idx + 1, rounds.length)} of ${rounds.length}`
  }, [idx, rounds.length])

  async function choose(choiceId: string) {
    if (!run || !sim || run.status === 'completed' || !currentRound) return
    const choice = currentRound.choices.find((c) => c.id === choiceId)
    if (!choice) return

    const newAnswer: RunAnswer = {
      roundIndex: idx,
      choiceId,
      at: new Date().toISOString(),
    }
    const nextAnswers = [...answers, newAnswer]
    const nextIdx = idx + 1

    setError(null)
    try {
      const res = await fetch(`/api/simulator/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: nextAnswers,
          currentRoundIndex: nextIdx,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof j.error === 'string' ? j.error : 'Could not save')
      }
      setRun((r) =>
        r
          ? {
              ...r,
              answers: nextAnswers,
              current_round_index: nextIdx,
            }
          : r
      )
      setLastChoiceLabel(choice.label)
      setShowFeedback(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  function continueFromFeedback() {
    setShowFeedback(false)
    setLastChoiceLabel(null)
  }

  async function complete() {
    setSubmitting(true)
    setCompleteError(null)
    try {
      const res = await fetch(`/api/simulator/runs/${runId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copilotProblem: copilotProblem.trim() || undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setCompleteError(typeof j.error === 'string' ? j.error : 'Daily limit reached')
        return
      }
      if (!res.ok) {
        throw new Error(typeof j.error === 'string' ? j.error : 'Could not complete')
      }
      await load()
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : 'Complete failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Feedback payload: last answer in rounds
  const feedbackRoundIndex = answers.length > 0 ? answers[answers.length - 1].roundIndex : -1
  const feedbackChoice =
    feedbackRoundIndex >= 0
      ? rounds[feedbackRoundIndex]?.choices.find((c) => c.id === answers[answers.length - 1]?.choiceId)
      : undefined

  if (loading && !run) {
    return (
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-12">
        <p className="text-charcoal-500 text-sm">Loading...</p>
      </main>
    )
  }

  if (error && !run) {
    return (
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-12">
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <Link href={`/${podcastSlug}/simulator`} className="text-accent-600 text-sm hover:underline">
          ← Back to catalog
        </Link>
      </main>
    )
  }

  if (run?.status === 'completed') {
    if (!profileOk) {
      return (
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-8 md:py-10">
          <p className="text-sm text-charcoal-500 mb-2">
            <Link href={`/${podcastSlug}/simulator`} className="hover:text-accent-600">
              ← All simulations
            </Link>
          </p>
          <h1 className="text-2xl font-serif text-charcoal-900 mb-4">Completed</h1>
          {run.llm_summary && (
            <pre className="whitespace-pre-wrap text-sm text-charcoal-700 bg-cream-100 rounded-lg p-4 border border-charcoal-200">
              {run.llm_summary}
            </pre>
          )}
          {!run.llm_summary && <p className="text-charcoal-600 text-sm">No profile is available for this run.</p>}
          <button
            type="button"
            className="btn-secondary mt-6"
            onClick={() => router.push(`/${podcastSlug}/simulator`)}
          >
            Back to catalog
          </button>
        </main>
      )
    }

    return (
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-8 md:py-10">
        <p className="text-sm text-charcoal-500 mb-2">
          <Link href={`/${podcastSlug}/simulator`} className="hover:text-accent-600">
            ← All simulations
          </Link>
        </p>
        <h1 className="text-2xl md:text-3xl font-serif text-charcoal-900 mb-2">Operator profile</h1>
        <p className="text-charcoal-600 mb-8">{sim?.title}</p>

        <div className="rounded-xl border border-charcoal-200 bg-white p-6 md:p-8 mb-8 shadow-sm">
          <p className="text-lg font-medium text-charcoal-900 mb-4">{profileOk.headline}</p>
          <ul className="space-y-2 text-sm text-charcoal-700 mb-6">
            <li>
              <span className="text-charcoal-500">Speed vs depth:</span> {profileOk.speedVsDepth}
            </li>
            <li>
              <span className="text-charcoal-500">Short vs long:</span> {profileOk.shortVsLong}
            </li>
            <li>
              <span className="text-charcoal-500">Risk vs conviction:</span> {profileOk.riskVsConviction}
            </li>
          </ul>
          {profileOk.blindspots?.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal-500 mb-2">Blind spots</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-charcoal-700">
                {profileOk.blindspots.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-charcoal-700 border-t border-charcoal-100 pt-4">{profileOk.copilotNudge}</p>
        </div>

        {llmCitations && llmCitations.citations?.length > 0 && (
          <div className="rounded-xl border border-charcoal-200 bg-white p-6 md:p-8 mb-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-charcoal-500 mb-1">
                  Evidence & citations
                </h2>
                <p className="text-sm text-charcoal-700">
                  {llmCitations.hasHighConfidence
                    ? 'At least one high-confidence moment matched your decisions.'
                    : 'No high-confidence moments found, but here are the closest matches.'}
                </p>
              </div>
              {llmCitations.hasHighConfidence && (
                <span className="text-[10px] uppercase tracking-wide font-semibold text-white bg-accent-600 px-2 py-1 rounded">
                  High confidence
                </span>
              )}
            </div>

            <ul className="space-y-3">
              {llmCitations.citations.slice(0, 5).map((c, i) => (
                <li key={i} className="rounded-lg border border-charcoal-100 bg-cream-50/80 p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-charcoal-900">{c.guestName}</span>
                    <span className="text-charcoal-400">·</span>
                    <span className="text-charcoal-700">{c.episodeTitle}</span>
                    <span
                      className={`ml-auto text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${
                        c.confidence === 'high'
                          ? 'bg-accent-50 text-accent-800'
                          : c.confidence === 'low'
                            ? 'bg-charcoal-100 text-charcoal-600'
                            : 'bg-charcoal-50 text-charcoal-700'
                      }`}
                    >
                      {c.confidence}
                    </span>
                  </div>

                  {c.timestamp && <p className="text-xs text-charcoal-500 mb-2">{c.timestamp}</p>}
                  <p className="leading-relaxed text-sm text-charcoal-700 whitespace-pre-wrap">
                    {c.quote}
                  </p>

                  {c.episodeUrl && (
                    <a
                      href={c.episodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-accent-600 hover:underline text-sm"
                    >
                      Open clip
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {copilotOut && (
          <div className="rounded-xl border border-accent-200 bg-accent-50/40 p-6 md:p-8 mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-accent-800 mb-4">Practical copilot</h2>
            <div className="space-y-4 text-sm text-charcoal-800">
              <div>
                <h3 className="font-medium text-charcoal-900 mb-1">Approach</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {copilotOut.howToApproach.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-charcoal-900 mb-1">Do</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {copilotOut.whatToDo.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-charcoal-900 mb-1">Trade-offs</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {copilotOut.tradeoffs.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-charcoal-900 mb-1">Avoid</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {copilotOut.whatNotToDo.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
              <p className="text-charcoal-600 italic pt-2 border-t border-accent-200/60">{copilotOut.profileNudge}</p>
            </div>
          </div>
        )}

        <button type="button" className="btn-secondary" onClick={() => router.push(`/${podcastSlug}/simulator`)}>
          Run another scenario
        </button>
      </main>
    )
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-8 md:py-10">
      <p className="text-sm text-charcoal-500 mb-2">
        <Link href={`/${podcastSlug}/simulator`} className="hover:text-accent-600">
          ← All simulations
        </Link>
      </p>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <h1 className="text-xl md:text-2xl font-serif text-charcoal-900">{sim?.title ?? 'Simulation'}</h1>
        {!atSubmitGate && (
          <span className="text-xs text-charcoal-500 shrink-0">{progressLabel}</span>
        )}
      </div>
      {sim?.teaser && <p className="text-charcoal-600 text-sm mb-6">{sim.teaser}</p>}

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      {atSubmitGate && (
        <div className="space-y-6">
          <p className="text-charcoal-700">
            You&apos;ve completed all rounds. Submit to generate your profile
            {copilotProblem.trim() ? ' and optional copilot plan' : ''}. This uses one LLM call.
          </p>
          <div>
            <label htmlFor="copilot" className="block text-sm font-medium text-charcoal-800 mb-2">
              Optional: a real decision you&apos;re facing (for tailored copilot output)
            </label>
            <textarea
              id="copilot"
              className="input-editorial min-h-[100px]"
              placeholder="e.g. We are deciding whether to cut a feature to ship on time."
              value={copilotProblem}
              onChange={(e) => setCopilotProblem(e.target.value)}
              maxLength={2000}
            />
          </div>
          {completeError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {completeError}
            </div>
          )}
          <button type="button" className="btn-accent" disabled={submitting} onClick={complete}>
            {submitting ? 'Generating profile...' : 'Submit and generate profile'}
          </button>
        </div>
      )}

      {!atSubmitGate && currentRound && !showFeedback && (
        <div className="rounded-xl border border-charcoal-200 bg-white p-5 md:p-6 shadow-sm">
          <p className="text-sm md:text-base text-charcoal-800 leading-relaxed mb-5 whitespace-pre-wrap">{currentRound.prompt}</p>
          <div className="space-y-3">
            {currentRound.choices.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left rounded-lg border border-charcoal-200 px-4 py-3 text-sm text-charcoal-800 hover:border-accent-300 hover:bg-cream-50 transition-colors"
                onClick={() => choose(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showFeedback && feedbackChoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-charcoal-900/40 p-4">
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-charcoal-200 p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            <p id="feedback-title" className="text-xs font-semibold uppercase tracking-wide text-charcoal-500 mb-1">
              Your choice
            </p>
            <p className="text-charcoal-900 font-medium mb-4">{lastChoiceLabel ?? feedbackChoice.label}</p>

            <div className="space-y-3 text-sm text-charcoal-700 mb-4">
              <p>
                <span className="text-charcoal-500 font-medium">Immediate impact: </span>
                {feedbackChoice.feedback.layer1}
              </p>
              <p>
                <span className="text-charcoal-500 font-medium">Trade-off: </span>
                {feedbackChoice.feedback.layer2}
              </p>
              <p>
                <span className="text-charcoal-500 font-medium">If repeated: </span>
                {feedbackChoice.feedback.layer3}
              </p>
            </div>

            <div className="border-t border-charcoal-100 pt-4 mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500 mb-2">Operator lens</p>
              <p className="text-sm font-medium text-charcoal-900 mb-1">{feedbackChoice.layer4_static.headline}</p>
              <p className="text-sm text-charcoal-700 mb-3">{feedbackChoice.layer4_static.operatorLine}</p>
              {feedbackChoice.layer4_static.whatTheyDid.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-charcoal-600 mb-2">
                  {feedbackChoice.layer4_static.whatTheyDid.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              )}
              {youtubeEmbedUrl(feedbackChoice.layer4_static.videoUrl) && (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-charcoal-100 mb-3">
                  <iframe
                    title="Related clip"
                    className="w-full h-full"
                    src={youtubeEmbedUrl(feedbackChoice.layer4_static.videoUrl)!}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              <p className="text-sm text-charcoal-700">{feedbackChoice.layer4_static.takeaway}</p>
            </div>

            <div className="border-t border-charcoal-100 pt-4 mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500 mb-1">
                From the archive
              </p>
              <p className="text-xs text-charcoal-500 mb-3">
                Matched to interview transcripts via embeddings. Similar themes appear on the{' '}
                <Link href={`/${podcastSlug}/graph`} className="text-accent-600 hover:underline">
                  theme graph
                </Link>
                .
              </p>
              {citationsState.loading && (
                <p className="text-sm text-charcoal-500 italic">Finding related moments...</p>
              )}
              {citationsState.error && (
                <p className="text-xs text-charcoal-500">{citationsState.error}</p>
              )}
              {!citationsState.loading && !citationsState.error && citationsState.items.length === 0 && (
                <p className="text-xs text-charcoal-500">
                  No close transcript matches for this choice right now.
                </p>
              )}
              {!citationsState.loading && citationsState.items.length > 0 && (
                <ul className="space-y-3">
                  {citationsState.items.slice(0, 3).map((c) => (
                    <li
                      key={c.chunkId}
                      className="rounded-lg border border-charcoal-100 bg-cream-50/80 p-3 text-xs text-charcoal-700"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-charcoal-900">{c.guestName}</span>
                        <span className="text-charcoal-400">·</span>
                        <span className="text-charcoal-600">{c.episodeTitle}</span>
                        {c.highConfidence && (
                          <span className="ml-auto text-[10px] uppercase tracking-wide font-semibold text-accent-700 bg-accent-50 px-2 py-0.5 rounded">
                            Strong match
                          </span>
                        )}
                        {!c.highConfidence && (
                          <span className="ml-auto text-[10px] text-charcoal-400">
                            {(c.similarity * 100).toFixed(0)}% similar
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed line-clamp-6">{c.text}</p>
                      {c.episodeUrl && (
                        <a
                          href={c.episodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-accent-600 hover:underline"
                        >
                          Open in YouTube
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {citationsState.hasHighConfidence && !citationsState.loading && (
                <p className="text-[11px] text-charcoal-500 mt-2">
                  At least one moment meets a higher-confidence match threshold.
                </p>
              )}
            </div>

            <button type="button" className="btn-primary w-full" onClick={continueFromFeedback}>
              {idx >= rounds.length ? 'Review and submit' : 'Next round'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
