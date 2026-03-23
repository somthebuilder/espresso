-- Cache “evidence gems” (top transcript chunks) per simulation run answer
-- so final summaries can include real guest examples with citations.

-- Adds a JSONB column to store citations generated/selected for the final summary.
ALTER TABLE simulation_runs
  ADD COLUMN IF NOT EXISTS llm_citations JSONB;

-- Stores retrieved citations for each (run, roundIndex, choiceId).
-- Written by server (service role). No direct client access.
CREATE TABLE IF NOT EXISTS simulation_run_choice_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL,
  choice_id TEXT NOT NULL,
  query_text TEXT,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_high_confidence BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, round_index, choice_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_run_choice_evidence_run
  ON simulation_run_choice_evidence(run_id);

ALTER TABLE simulation_run_choice_evidence ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'simulation_run_choice_evidence'
      AND policyname = 'Deny all access to evidence cache'
  ) THEN
    CREATE POLICY "Deny all access to evidence cache"
      ON simulation_run_choice_evidence
      FOR ALL USING (false) WITH CHECK (false);
  END IF;
END $$;

