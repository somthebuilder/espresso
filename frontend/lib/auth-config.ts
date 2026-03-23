/**
 * Authentication gate (magic link + “has account” localStorage hint).
 *
 * Default: **open** — users can use chat and suggestions without signing in.
 * Set in `.env.local`:
 *   NEXT_PUBLIC_AUTH_REQUIRED=true
 * to require magic-link sign-in for chat and for submitting podcast suggestions.
 */
export const AUTH_REQUIRED = process.env.NEXT_PUBLIC_AUTH_REQUIRED === 'true'
