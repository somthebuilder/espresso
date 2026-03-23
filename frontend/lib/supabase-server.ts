import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createServerSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** User-facing hint when simulator / server writes fail due to missing key */
export const SERVICE_ROLE_ENV_HINT =
  'Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) to .env.local — the anon key cannot insert into simulation_runs (RLS).'

/**
 * Service role bypasses RLS. Required for simulation_runs reads/writes.
 * Do not fall back to the anon key — inserts will fail with "row-level security policy".
 */
export function getServiceRoleSupabase(): SupabaseClient | null {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_KEY?.trim()
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !key) {
    return null
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

