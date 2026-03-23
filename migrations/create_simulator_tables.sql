-- Operator Simulator: catalog + persisted runs (service role / API only writes)
-- LLM is invoked only when a run is completed (final submit), not per step.
--
-- NOTE: The same DDL is prepended to seed_simulator_data.sql for one-shot Supabase runs.
-- If you change this file, update the schema block in seed_simulator_data.sql to match.

CREATE TABLE IF NOT EXISTS simulation_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('product', 'growth', 'leadership', 'strategy', 'mixed')),
  title TEXT NOT NULL,
  teaser TEXT,
  cover_emoji TEXT,
  rounds JSONB NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  published BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (podcast_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_simulation_definitions_podcast_published
  ON simulation_definitions (podcast_id, published, display_order);

CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  simulation_id UUID NOT NULL REFERENCES simulation_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  current_round_index INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  llm_summary TEXT,
  llm_profile JSONB,
  copilot_input TEXT,
  copilot_output JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_simulation_runs_user_completed
  ON simulation_runs (user_key, completed_at DESC)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_simulation_runs_simulation
  ON simulation_runs (simulation_id);

ALTER TABLE simulation_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;

-- Definitions: public read for published rows (optional; app uses service role anyway)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'simulation_definitions' AND policyname = 'Public read published simulations'
  ) THEN
    CREATE POLICY "Public read published simulations" ON simulation_definitions
      FOR SELECT USING (published = true);
  END IF;
END $$;

-- Runs: no direct client access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'simulation_runs' AND policyname = 'No direct client access to simulation runs'
  ) THEN
    CREATE POLICY "No direct client access to simulation runs" ON simulation_runs
      FOR ALL USING (false) WITH CHECK (false);
  END IF;
END $$;

COMMENT ON TABLE simulation_definitions IS 'Curated multi-round decision simulations; content in rounds JSONB';
COMMENT ON TABLE simulation_runs IS 'Per-user simulation attempts; LLM fields set only on complete';
