import type { NextRequest } from 'next/server'

/** Web Crypto SHA-256 hex — matches chat route fingerprinting. */
export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function getSimulatorUserKey(request: NextRequest): Promise<string> {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const hash = await sha256Hex(`${ip}:${userAgent}`)
    return hash.slice(0, 32)
  } catch {
    return 'anon'
  }
}
