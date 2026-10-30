'use client'

import { useEffect, useRef } from 'react'

export const MAX_QUESTION_LENGTH = 500

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  disabled?: boolean
  isLoading?: boolean
  /** Larger, centered treatment used before the first question */
  variant?: 'hero' | 'dock'
  autoFocus?: boolean
  speech?: {
    isSupported: boolean
    isListening: boolean
    elapsed: number
    error: string | null
    onToggle: () => void
    onCancel: () => void
  }
}

export default function ChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  isLoading = false,
  variant = 'dock',
  autoFocus = false,
  speech,
}: ChatComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHero = variant === 'hero'
  const canSend = value.trim().length > 0 && !disabled && !isLoading
  const showMic = speech?.isSupported && !disabled && !isLoading
  const nearLimit = value.length > MAX_QUESTION_LENGTH - 100

  useEffect(() => {
    // Skip on touch devices so the keyboard doesn't cover the suggestions on first load
    if (!autoFocus || typeof window === 'undefined') return
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus()
  }, [autoFocus])

  return (
    <div className="w-full">
      {speech?.error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">{speech.error}</p>
      )}

      {speech?.isListening && (
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            type="button"
            onClick={speech.onCancel}
            className="text-xs text-charcoal-500 hover:text-charcoal-800 transition-colors"
          >
            Cancel recording
          </button>
          <span className="flex items-center gap-2 text-xs font-mono text-red-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            {speech.elapsed}s
          </span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSend) onSubmit()
        }}
        className={`relative flex items-center gap-1 bg-white border transition-all ${
          isHero
            ? 'rounded-2xl pl-5 pr-2 py-2 shadow-lg shadow-espresso-200/30 border-espresso-200/70'
            : 'rounded-xl pl-4 pr-1.5 py-1.5 shadow-sm border-charcoal-200/70'
        } ${
          speech?.isListening
            ? 'ring-2 ring-red-300/50 border-red-200'
            : 'focus-within:border-accent-300 focus-within:ring-2 focus-within:ring-accent-100'
        } ${disabled ? 'opacity-70' : ''}`}
      >
        <label htmlFor={`chat-input-${variant}`} className="sr-only">
          Your question
        </label>
        <input
          id={`chat-input-${variant}`}
          ref={inputRef}
          type="text"
          value={value}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          autoComplete="off"
          className={`flex-1 min-w-0 bg-transparent text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none disabled:cursor-not-allowed ${
            isHero ? 'text-base py-2' : 'text-sm py-2'
          } ${speech?.isListening ? 'italic text-charcoal-600' : ''}`}
        />

        {showMic && (
          <button
            type="button"
            onClick={speech!.onToggle}
            aria-label={speech!.isListening ? 'Stop recording' : 'Ask with your voice'}
            title={speech!.isListening ? 'Stop recording' : 'Ask with your voice'}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
              speech!.isListening
                ? 'text-red-500 hover:bg-red-50'
                : 'text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-100'
            }`}
          >
            {speech!.isListening ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            )}
          </button>
        )}

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send question"
          className={`flex-shrink-0 inline-flex items-center justify-center rounded-xl transition-all ${
            isHero ? 'w-10 h-10' : 'w-9 h-9'
          } ${
            canSend
              ? 'bg-accent-600 text-white hover:bg-accent-700 shadow-sm'
              : 'bg-cream-100 text-charcoal-300'
          }`}
        >
          {isLoading ? (
            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          )}
        </button>
      </form>

      {nearLimit && (
        <p className={`mt-1.5 px-1 text-right text-[11px] ${value.length >= MAX_QUESTION_LENGTH ? 'text-red-600' : 'text-charcoal-400'}`}>
          {value.length}/{MAX_QUESTION_LENGTH}
        </p>
      )}
    </div>
  )
}
