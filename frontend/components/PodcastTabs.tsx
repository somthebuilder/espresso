'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import ConceptCard from '@/components/concepts/ConceptCard'
import { Concept } from '@/lib/api/concepts'
import { searchConcepts } from '@/lib/concept-search'
import { sendMessage, submitQuiz, ConversationTurn } from '@/lib/api/chat'
import { ChatMessage, QuizPath, QuizResponse } from '@/lib/types/rag'
import LightningQuiz from '@/components/quiz/LightningQuiz'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import BeanAnimation from '@/components/BeanAnimation'
import ReactMarkdown from 'react-markdown'
import AuthModal from '@/components/AuthModal'
import ChatComposer from '@/components/chat/ChatComposer'
import { PODCAST_TABS, PodcastTabId } from '@/components/podcast-tabs-config'
import { AUTH_REQUIRED } from '@/lib/auth-config'

type TabId = PodcastTabId

const DAILY_QUESTION_LIMIT = 5

const STARTER_QUESTIONS: { label: string; question: string }[] = [
  { label: 'Shreyas Doshi on high-leverage work', question: 'What does Shreyas Doshi say about high-leverage work for PMs?' },
  { label: 'Most recommended books for PMs', question: 'What books do guests recommend most for product managers?' },
  { label: 'Data vs. intuition', question: 'Where do guests disagree on when to use data vs. intuition?' },
  { label: 'Prioritization frameworks', question: 'What frameworks do guests use for prioritization?' },
]

interface PodcastTabsProps {
  podcastSlug: string
  concepts: Concept[]
  conceptsTotal?: number
  previewMode?: boolean
  initialTab?: TabId
}

/* ── Helper: Fisher-Yates shuffle (returns new array) ── */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/* ── Helper: build deep-linked YouTube URL ── */
function deepLink(url?: string, timeSeconds?: number): string | null {
  if (!url) return null
  if (timeSeconds && timeSeconds > 0 && !url.includes('&t=')) {
    return `${url}&t=${timeSeconds}`
  }
  return url
}

function formatSeconds(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function normalizeInitialTab(tab: TabId | undefined): TabId {
  if (tab === 'chat') return 'chat'
  return 'concepts'
}

export default function PodcastTabs({
  podcastSlug,
  concepts,
  conceptsTotal = concepts.length,
  previewMode = false,
  initialTab,
}: PodcastTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(() => normalizeInitialTab(initialTab))
  const [conceptItems, setConceptItems] = useState<Concept[]>(concepts)
  const [conceptTotal, setConceptTotal] = useState(conceptsTotal)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [conceptQuery, setConceptQuery] = useState('')

  // Shuffle key: increments on tab switch so card order feels fresh each time
  const [shuffleKey, setShuffleKey] = useState(0)
  // Random shuffle must not run during SSR/first paint — it breaks hydration (server HTML ≠ client).
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    setHasMounted(true)
  }, [])
  const shuffledConcepts = useMemo(() => {
    if (!hasMounted) return conceptItems
    return shuffleArray(conceptItems)
  }, [hasMounted, conceptItems, shuffleKey])

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null)
  const [creditsTotal, setCreditsTotal] = useState<number | null>(null)
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined)
  const [chatError, setChatError] = useState<string | null>(null)

  // Lightning Quiz state
  const [quizActive, setQuizActive] = useState(false)
  const [quizCredits, setQuizCredits] = useState<number | null>(null)
  const [quizCreditsTotal, setQuizCreditsTotal] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Local auth hint for chat gating when AUTH_REQUIRED (avoids client Supabase auth refresh calls)
  const [hasAccount, setHasAccount] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const canUseChat = !AUTH_REQUIRED || hasAccount

  // Speech-to-text
  const {
    isSupported: sttSupported,
    isListening,
    transcript,
    elapsed,
    error: sttError,
    startListening,
    stopAndKeep,
    cancelListening,
  } = useSpeechToText({ silenceTimeout: 3, maxDuration: 120 })

  // Sync transcript → chatInput while listening
  useEffect(() => {
    if (isListening) setChatInput(transcript)
  }, [isListening, transcript])

  // The page itself scrolls, so bring the newest message into view rather than scrolling a container
  useEffect(() => {
    if (messages.length === 0 && !isChatLoading) return
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isChatLoading])

  // Floating widgets sit in the bottom-right corner, where the chat's send button lives
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.dataset.chatActive = activeTab === 'chat' ? 'true' : 'false'
    return () => {
      delete document.body.dataset.chatActive
    }
  }, [activeTab])

  // Track account hint for chat gating (only matters when AUTH_REQUIRED)
  useEffect(() => {
    if (!AUTH_REQUIRED || typeof window === 'undefined') return
    setHasAccount(localStorage.getItem('espresso_has_account') === '1')
  }, [])

  useEffect(() => {
    setConceptItems(concepts)
    setConceptTotal(conceptsTotal)
  }, [concepts, conceptsTotal, podcastSlug])

  useEffect(() => {
    setSelectedCategory(null)
    setConceptQuery('')
  }, [podcastSlug])

  function syncTabToUrl(tabId: TabId) {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('tab') === tabId) return
    url.searchParams.set('tab', tabId)
    window.history.replaceState({}, '', url.toString())
  }

  function handleTabChange(tabId: TabId) {
    setActiveTab(tabId)
    setShuffleKey((k) => k + 1) // re-shuffle cards on tab switch
  }

  const tabStorageKey = `espresso_last_tab_${podcastSlug}`

  useEffect(() => {
    if (!initialTab) return
    setActiveTab(normalizeInitialTab(initialTab))
  }, [initialTab])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (initialTab) {
      localStorage.setItem(tabStorageKey, initialTab)
      return
    }
    const stored = localStorage.getItem(tabStorageKey)
    if (stored === 'chat') {
      setActiveTab('chat')
    } else if (stored === 'concepts' || stored === 'insights') {
      setActiveTab('concepts')
    }
  }, [initialTab, tabStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(tabStorageKey, activeTab)
    syncTabToUrl(activeTab)
  }, [activeTab, tabStorageKey])

  // Build conversation history for API
  function buildConversationHistory(): ConversationTurn[] {
    return messages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }))
  }

  async function askBean(text: string) {
    const question = text.trim()
    if (!question || isChatLoading || creditsRemaining === 0) return

    if (question.toLowerCase().replace(/[^a-z ]/g, '').includes('lightning quiz')) {
      setChatInput('')
      setQuizActive(true)
      return
    }

    if (isListening) stopAndKeep()

    setChatError(null)

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    }
    const history = buildConversationHistory()
    setMessages((prev) => [...prev, userMsg])
    setChatInput('')
    setIsChatLoading(true)

    try {
      const response = await sendMessage(question, podcastSlug, history, chatSessionId)
      setMessages((prev) => [...prev, response])
      // Track session ID for multi-turn persistence
      if (response.session_id) {
        setChatSessionId(response.session_id)
      }
      // Update credits from response
      if (response.credits_remaining !== undefined) {
        setCreditsRemaining(response.credits_remaining)
      }
      if (response.credits_total !== undefined) {
        setCreditsTotal(response.credits_total)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const err = error as Error & {
        credits_remaining?: number
        credits_total?: number
      }
      setChatError(err.message || 'Something went wrong. Try again.')
      // Drop the unanswered question from the thread and hand it back so nothing has to be retyped
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      setChatInput(question)
      if (err.credits_remaining !== undefined) {
        setCreditsRemaining(err.credits_remaining)
      }
      if (err.credits_total !== undefined) {
        setCreditsTotal(err.credits_total)
      }
    } finally {
      setIsChatLoading(false)
    }
  }

  function startNewChat() {
    setMessages([])
    setChatSessionId(undefined)
    setChatError(null)
    setChatInput('')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Lightning Quiz submit handler
  async function handleQuizSubmit(
    path: QuizPath,
    tags: Record<string, number>,
    topTags: string[]
  ): Promise<QuizResponse> {
    const response = await submitQuiz(podcastSlug, path, tags, topTags)
    if (response.quiz_credits_remaining !== undefined) {
      setQuizCredits(response.quiz_credits_remaining)
    }
    if (response.quiz_credits_total !== undefined) {
      setQuizCreditsTotal(response.quiz_credits_total)
    }
    return response
  }

  function handleMicClick() {
    if (isListening) {
      stopAndKeep()
    } else {
      startListening()
    }
  }

  function handleCancelSpeech() {
    cancelListening()
    setChatInput('')
  }

  const hasConversation = messages.length > 0
  const composerPlaceholder = isListening
    ? 'Listening…'
    : creditsRemaining === 0
      ? "You've used today's questions. Back tomorrow."
      : hasConversation
        ? 'Ask a follow-up…'
        : 'Ask about product, growth, hiring, leadership…'
  const creditsLine =
    creditsRemaining !== null && creditsTotal !== null
      ? `${creditsRemaining} of ${creditsTotal} questions left today`
      : `${DAILY_QUESTION_LIMIT} free questions a day`
  const speechProps = {
    isSupported: sttSupported,
    isListening,
    elapsed,
    error: sttError,
    onToggle: handleMicClick,
    onCancel: handleCancelSpeech,
  }

  return (
    <div className="flex flex-col flex-1">
      {/* ── Sticky Tab Bar ── */}
      <div className="sticky top-14 z-30 bg-cream-50/95 backdrop-blur-md border-b border-charcoal-200/50">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <nav className="flex gap-1" role="tablist">
            {PODCAST_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-charcoal-900'
                    : 'text-charcoal-400 hover:text-charcoal-600'
                }`}
              >
                {tab.icon}
                {tab.label}
                {/* Active indicator */}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-charcoal-900 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1">
        {/* ════════════════════════════════════════
            CONCEPTS TAB
           ════════════════════════════════════════ */}
        {activeTab === 'concepts' && (() => {
          const isSearching = conceptQuery.trim().length > 0
          const searchedConcepts = searchConcepts(shuffledConcepts, conceptQuery)

          // Category counts reflect the current search so pills never point at empty results
          const categoryMap = new Map<string, number>()
          searchedConcepts.forEach((c) => {
            if (c.category) {
              categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1)
            }
          })
          const availableCategories = Array.from(categoryMap.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .map(([cat]) => cat)
          if (selectedCategory && !categoryMap.has(selectedCategory)) {
            availableCategories.push(selectedCategory)
          }

          const filteredConcepts = selectedCategory
            ? searchedConcepts.filter((c) => c.category === selectedCategory)
            : searchedConcepts
          const allCount = isSearching ? searchedConcepts.length : conceptTotal

          const resultLabel = (() => {
            const n = filteredConcepts.length
            const noun = `concept${n === 1 ? '' : 's'}`
            if (isSearching && selectedCategory) return `${n} ${noun} matching “${conceptQuery.trim()}” in ${selectedCategory}`
            if (isSearching) return `${n} ${noun} matching “${conceptQuery.trim()}”`
            if (selectedCategory) return `${n} ${noun} in this category`
            return `${conceptTotal} concept${conceptTotal === 1 ? '' : 's'}`
          })()

          return (
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-5">
              {previewMode && (
                <div className="mb-4 text-xs text-charcoal-500 bg-cream-100 border border-charcoal-200 rounded-lg px-3 py-2">
                  Showing temporary dry-run concepts preview. Open concept links
                  are disabled in preview mode.
                </div>
              )}
              {shuffledConcepts.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-charcoal-400 font-serif italic text-lg">
                    Concepts are being generated…
                  </p>
                  <p className="text-sm text-charcoal-400 mt-2">
                    Check back soon as we extract insights from the transcripts.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile/Tablet: Category Pills */}
                  <div className="lg:hidden mb-5">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          selectedCategory === null
                            ? 'bg-charcoal-900 text-white shadow-sm'
                            : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200'
                        }`}
                      >
                        All
                        <span className={`ml-1.5 ${selectedCategory === null ? 'text-charcoal-300' : 'text-charcoal-400'}`}>
                          {allCount}
                        </span>
                      </button>
                      {availableCategories.map((category) => {
                        const count = categoryMap.get(category) || 0
                        const isSelected = selectedCategory === category
                        return (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                              isSelected
                                ? 'bg-charcoal-900 text-white shadow-sm'
                                : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200'
                            }`}
                          >
                            {category}
                            <span className={`ml-1.5 ${isSelected ? 'text-charcoal-300' : 'text-charcoal-400'}`}>
                              {count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Desktop: Grid Layout with Sidebar */}
                  <div className="flex gap-8">
                    {/* Category Sidebar - Desktop Only */}
                    <div className="hidden lg:block w-44 flex-shrink-0">
                      <div className="sticky top-24 space-y-1.5">
                        <h3 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-3">Categories</h3>
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedCategory === null
                              ? 'bg-charcoal-900 text-white font-medium'
                              : 'text-charcoal-600 hover:bg-cream-100'
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            All
                            <span className="text-xs text-charcoal-400">
                              {allCount}
                            </span>
                          </span>
                        </button>
                        {availableCategories.map((category) => {
                          const count = categoryMap.get(category) || 0
                          const isSelected = selectedCategory === category
                          return (
                            <button
                              key={category}
                              onClick={() => setSelectedCategory(category)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                isSelected
                                  ? 'bg-charcoal-900 text-white font-medium'
                                  : 'text-charcoal-600 hover:bg-cream-100'
                              }`}
                            >
                              <span className="flex items-center justify-between">
                                {category}
                                <span className={`text-xs ${isSelected ? 'text-charcoal-400' : 'text-charcoal-400'}`}>
                                  {count}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Concepts List */}
                    <div className="flex-1 min-w-0">
                      <div className="relative mb-3">
                        <svg
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="11" cy="11" r="7" />
                          <path d="M20 20l-3.5-3.5" />
                        </svg>
                        <input
                          type="search"
                          value={conceptQuery}
                          onChange={(e) => setConceptQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setConceptQuery('')
                          }}
                          placeholder="Search concepts, guests, or topics"
                          aria-label="Search concepts"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-cream-100 border border-transparent text-sm text-charcoal-800 placeholder:text-charcoal-400 focus:outline-none focus:bg-white focus:border-accent-300 focus:ring-2 focus:ring-accent-100 transition-colors [&::-webkit-search-cancel-button]:hidden"
                        />
                        {isSearching && (
                          <button
                            type="button"
                            onClick={() => setConceptQuery('')}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-200 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="mb-4 text-xs text-charcoal-500" aria-live="polite">
                        {resultLabel}
                      </div>
                      {filteredConcepts.length === 0 ? (
                        <div className="py-20 text-center space-y-3">
                          <p className="text-charcoal-400 font-serif italic text-lg">
                            {isSearching
                              ? `No concepts match “${conceptQuery.trim()}”${selectedCategory ? ` in ${selectedCategory}` : ''}.`
                              : 'No concepts found in this category.'}
                          </p>
                          {isSearching && (
                            <div className="flex items-center justify-center gap-4 text-sm">
                              {selectedCategory && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedCategory(null)}
                                  className="text-accent-600 hover:text-accent-700 font-medium"
                                >
                                  Search all categories
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setConceptQuery('')}
                                className="text-accent-600 hover:text-accent-700 font-medium"
                              >
                                Clear search
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0">
                          {filteredConcepts.map((concept) => (
                            <ConceptCard
                              key={concept.id}
                              concept={concept}
                              podcastSlug={podcastSlug}
                              previewMode={previewMode}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })()}

        {/* ════════════════════════════════════════
            BEAN CHAT TAB
           ════════════════════════════════════════ */}
        {activeTab === 'chat' && (
          <div
            className="max-w-3xl mx-auto w-full px-4 md:px-6 flex flex-col"
            style={{ minHeight: 'calc(100dvh - 7rem)' }}
          >
            {quizActive ? (
              <div className="flex-1 flex flex-col my-4 md:my-6 bg-gradient-to-b from-amber-50/30 to-cream-50 rounded-xl border border-amber-100/50 overflow-y-auto">
                <LightningQuiz
                  podcastSlug={podcastSlug}
                  onExit={() => setQuizActive(false)}
                  onSubmitQuiz={handleQuizSubmit}
                  quizCredits={quizCredits}
                  quizCreditsTotal={quizCreditsTotal}
                />
              </div>
            ) : !hasConversation ? (
              /* ── First visit: the question box sits with the introduction, not at the bottom edge ── */
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 md:py-14">
                <BeanAnimation size={72} />
                <h2 className="mt-4 text-2xl md:text-3xl font-serif font-semibold text-charcoal-900 tracking-tight">
                  What do you want to learn?
                </h2>
                <p className="mt-2 text-sm md:text-[15px] text-charcoal-500 max-w-md leading-relaxed">
                  Bean answers from 300+ episode transcripts and links every answer to the moment it was said.
                </p>

                <div className="mt-7 w-full max-w-xl text-left">
                  {canUseChat ? (
                    <ChatComposer
                      variant="hero"
                      autoFocus
                      value={chatInput}
                      onChange={(value) => {
                        if (isListening) stopAndKeep()
                        setChatInput(value)
                        setChatError(null)
                      }}
                      onSubmit={() => askBean(chatInput)}
                      placeholder={composerPlaceholder}
                      disabled={creditsRemaining === 0}
                      isLoading={isChatLoading}
                      speech={speechProps}
                    />
                  ) : (
                    <div className="flex justify-center">
                      <button onClick={() => setShowAuthModal(true)} className="btn-primary text-sm">
                        Sign in to ask Bean
                      </button>
                    </div>
                  )}
                  {chatError && (
                    <p role="alert" className="mt-3 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                      {chatError}
                    </p>
                  )}
                </div>

                {canUseChat && (
                  <div className="mt-6 w-full max-w-xl">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-charcoal-400 mb-2.5">
                      Try asking
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {STARTER_QUESTIONS.map((starter) => (
                        <button
                          key={starter.label}
                          type="button"
                          onClick={() => askBean(starter.question)}
                          disabled={isChatLoading || creditsRemaining === 0}
                          className="text-[13px] px-3.5 py-1.5 rounded-full bg-white border border-charcoal-200/70 text-charcoal-700 hover:border-accent-300 hover:text-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {starter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-10 flex flex-col items-center gap-3 text-xs text-charcoal-400">
                  {canUseChat && (
                    <button
                      type="button"
                      onClick={() => setQuizActive(true)}
                      className="inline-flex items-center gap-1.5 font-medium text-amber-700 hover:text-amber-800 transition-colors"
                    >
                      <span aria-hidden="true">&#9889;</span>
                      Not sure what to ask? Take the Lightning Quiz
                    </button>
                  )}
                  <p>{creditsLine} · Every answer cites its episodes</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-6 pt-6 pb-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={
                          msg.role === 'user'
                            ? 'max-w-[85%] bg-charcoal-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm'
                            : 'w-full max-w-none'
                        }
                      >
                        {msg.role === 'user' ? (
                          <p className="font-sans">{msg.content}</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                              <BeanAnimation size={24} loop={false} />
                              <span className="text-xs font-semibold text-charcoal-600">Bean</span>
                            </div>

                            <div className="text-[15px] text-charcoal-700 leading-relaxed prose prose-sm prose-charcoal max-w-none
                              prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
                              prose-strong:text-charcoal-900 prose-strong:font-semibold
                              prose-headings:text-charcoal-800 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                              prose-a:text-accent-600 prose-a:no-underline hover:prose-a:underline">
                              <ReactMarkdown>
                                {msg.content
                                  .replace(/\s*\(?\d{1,2}:\d{2}:\d{2}\)?\s*/g, ' ')
                                  .replace(/\s*\[\d{1,2}:\d{2}:\d{2}\]\s*/g, ' ')
                                  .replace(/  +/g, ' ')
                                  .trim()}
                              </ReactMarkdown>
                            </div>

                            {msg.needs_clarification &&
                              msg.clarification_questions &&
                              msg.clarification_questions.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {msg.clarification_questions
                                    .filter((q) => q.quickReply)
                                    .map((q, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => askBean(q.quickReply!)}
                                        disabled={isChatLoading}
                                        className="text-[13px] px-3.5 py-1.5 bg-white hover:border-accent-300 hover:text-accent-700 text-charcoal-700 rounded-full border border-charcoal-200/70 transition-colors disabled:opacity-50"
                                      >
                                        {q.quickReply}
                                      </button>
                                    ))}
                                </div>
                              )}

                            {msg.references && msg.references.length > 0 && (() => {
                              const seen = new Set<string>()
                              const unique = msg.references!.filter((ref) => {
                                const key = `${ref.guest_name}::${ref.episode_title}`
                                if (seen.has(key)) return false
                                seen.add(key)
                                return true
                              })
                              return (
                                <div className="space-y-2 pt-1">
                                  <p className="text-[11px] font-medium text-charcoal-400">
                                    From {unique.length} episode{unique.length === 1 ? '' : 's'}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {unique.map((ref, idx) => {
                                      const url = deepLink(ref.episode_url, ref.time_seconds)
                                      const ts = formatSeconds(ref.time_seconds) ?? ref.timestamp ?? null
                                      const Tag = url ? 'a' : 'div'
                                      const linkProps = url
                                        ? { href: url, target: '_blank' as const, rel: 'noopener noreferrer' }
                                        : {}
                                      return (
                                        <Tag
                                          key={idx}
                                          {...linkProps}
                                          title={url ? `Watch ${ref.guest_name}${ts ? ` at ${ts}` : ''}` : undefined}
                                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] leading-tight transition-colors ${
                                            url
                                              ? 'border-charcoal-200/60 bg-white hover:border-accent-300 cursor-pointer'
                                              : 'border-charcoal-100 bg-cream-50'
                                          }`}
                                        >
                                          {url && (
                                            <svg className="w-3.5 h-3.5 text-accent-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                              <path d="M8 5v14l11-7z" />
                                            </svg>
                                          )}
                                          <span className="min-w-0">
                                            <span className="font-semibold text-charcoal-800">{ref.guest_name}</span>
                                            {ts && <span className="text-charcoal-400 font-mono ml-1">{ts}</span>}
                                            <span className="block text-charcoal-500 truncate max-w-[220px] sm:max-w-[280px]">
                                              {ref.episode_title}
                                            </span>
                                          </span>
                                        </Tag>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="flex items-center gap-2" role="status">
                      <BeanAnimation size={24} />
                      <span className="text-sm text-charcoal-500">
                        Searching the episodes
                        <span className="inline-flex ml-0.5">
                          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                        </span>
                      </span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* ── Docked composer once the conversation has started ── */}
                <div className="sticky bottom-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-cream-50 via-cream-50 to-cream-50/0">
                  {chatError && (
                    <p role="alert" className="mb-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                      {chatError}
                    </p>
                  )}
                  {canUseChat ? (
                    <ChatComposer
                      value={chatInput}
                      onChange={(value) => {
                        if (isListening) stopAndKeep()
                        setChatInput(value)
                        setChatError(null)
                      }}
                      onSubmit={() => askBean(chatInput)}
                      placeholder={composerPlaceholder}
                      disabled={creditsRemaining === 0}
                      isLoading={isChatLoading}
                      speech={speechProps}
                    />
                  ) : (
                    <button onClick={() => setShowAuthModal(true)} className="btn-primary w-full text-sm">
                      Sign in to ask Bean
                    </button>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-charcoal-400">
                    <span className="flex items-center gap-1.5 min-w-0">
                      {creditsRemaining !== null && creditsTotal !== null && (
                        <span className="flex gap-0.5" aria-hidden="true">
                          {Array.from({ length: creditsTotal }).map((_, i) => (
                            <img
                              key={i}
                              src={i < creditsRemaining ? '/beansfilled.svg' : '/beanempty.svg'}
                              alt=""
                              className="w-3.5 h-3.5"
                              style={{ opacity: i < creditsRemaining ? 1 : 0.35 }}
                            />
                          ))}
                        </span>
                      )}
                      <span className="truncate">{creditsLine}</span>
                    </span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setQuizActive(true)}
                        disabled={isChatLoading}
                        className="hover:text-amber-700 transition-colors disabled:opacity-50"
                      >
                        <span aria-hidden="true">&#9889;</span> Lightning Quiz
                      </button>
                      <button
                        type="button"
                        onClick={startNewChat}
                        disabled={isChatLoading}
                        className="hover:text-charcoal-700 transition-colors disabled:opacity-50"
                      >
                        New chat
                      </button>
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {AUTH_REQUIRED && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signin"
        />
      )}
    </div>
  )
}
