'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuthModal from './AuthModal'
import { AUTH_REQUIRED } from '@/lib/auth-config'

type HeaderProps = {
  /** When set (e.g. Lenny’s podcast page), shows the bordered “Open Theme Graph” control in the header */
  themeGraphHref?: string
  /** Lenny-only: Operator Simulator */
  simulatorHref?: string
}

export default function Header({ themeGraphHref, simulatorHref }: HeaderProps) {
  const [hasAccount, setHasAccount] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (!AUTH_REQUIRED || typeof window === 'undefined') return
    setHasAccount(localStorage.getItem('espresso_has_account') === '1')
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur-xl border-b border-espresso-200/30">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/espresso-logo.png" alt="espresso" className="w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-105" />
            <span className="font-cafe italic text-lg text-espresso-600 group-hover:text-espresso-500 transition-colors select-none">
              espresso
            </span>
          </Link>

          {/* Secondary nav actions */}
          <div className="flex items-center gap-3">
            {themeGraphHref && (
              <Link
                href={themeGraphHref}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-charcoal-200 text-charcoal-600 hover:text-accent-700 hover:border-accent-200 hover:bg-white transition-colors"
              >
                <span>Open Theme Graph</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="5" cy="6" r="2" />
                  <circle cx="19" cy="6" r="2" />
                  <circle cx="12" cy="18" r="2" />
                  <path d="M7 6h10M6.7 7.2l4.6 9.2M17.3 7.2l-4.6 9.2" />
                </svg>
              </Link>
            )}
            {simulatorHref && (
              <Link
                href={simulatorHref}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-charcoal-200 text-charcoal-600 hover:text-accent-700 hover:border-accent-200 hover:bg-white transition-colors"
              >
                <span>Simulator</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </Link>
            )}
            {AUTH_REQUIRED && (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="text-xs font-medium text-charcoal-500 hover:text-espresso-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-espresso-50/60"
              >
                {hasAccount ? 'Continue' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </header>

      {AUTH_REQUIRED && (
        <AuthModal
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
          initialMode="signin"
        />
      )}
    </>
  )
}
