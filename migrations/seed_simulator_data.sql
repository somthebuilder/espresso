-- Operator Simulator: schema (idempotent) + seed for Lenny's Podcast
--
-- Safe to run as a single script in Supabase SQL Editor. Requires public.podcasts (FK) and
-- podcasts.slug = 'lennys-podcast' for inserts to apply.
--
-- Schema block is duplicated from create_simulator_tables.sql — keep both files in sync.

-- Operator Simulator: catalog + persisted runs (service role / API only writes)
-- LLM is invoked only when a run is completed (final submit), not per step.

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'simulation_definitions' AND policyname = 'Public read published simulations'
  ) THEN
    CREATE POLICY "Public read published simulations" ON simulation_definitions
      FOR SELECT USING (published = true);
  END IF;
END $$;

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

-- --- Seed (Lenny scenarios) ---

DO $$
DECLARE
  pid uuid;
BEGIN
  SELECT id INTO pid FROM public.podcasts WHERE slug = 'lennys-podcast' LIMIT 1;
  IF pid IS NULL THEN
    RAISE NOTICE 'seed_simulator_data: no podcast with slug lennys-podcast — skipping inserts';
  ELSE
  INSERT INTO public.simulation_definitions (
    podcast_id, slug, track, title, teaser, cover_emoji, rounds, estimated_minutes, published, display_order
  )
  VALUES (
    pid,
    'activation-cliff',
    'product',
    'The Activation Cliff',
    'When the funnel breaks and everyone wants a different fix.',
    '📉',
    $json$[
      {
        "prompt": "You’re a PM at a B2B SaaS company. Activation dropped from 40% to 25% in two weeks. Exec staff wants a fix on Monday’s roadmap review. What’s your first move?",
        "choices": [
          {
            "id": "a",
            "label": "Ship a time‑boxed incentive (extended trial + concierge onboarding)",
            "feedback": {
              "layer1": "You optimized for a visible activation lift fast.",
              "layer2": "Incentives can mask broken onboarding or wrong ICP.",
              "layer3": "Strong operators usually isolate whether the drop is acquisition, activation, or product before adding fuel."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Leaders like Brian Chesky leaned on direct user conversations when growth metrics wobbled — not bigger discounts first.",
              "whatTheyDid": ["Talked to users in the broken cohort", "Mapped the real activation path", "Fixed friction before incentives"],
              "impact": ["Clearer PMF signal", "Sustainable conversion vs sugar highs"],
              "videoUrl": null,
              "takeaway": "Quick wins feel productive. Root‑cause fixes build companies."
            },
            "profileWeights": { "speedVsDepth": 0.35, "shortVsLong": 0.4, "riskVsConviction": 0.2 }
          },
          {
            "id": "b",
            "label": "Freeze launches and run a 48h funnel + session replay triage",
            "feedback": {
              "layer1": "You chose diagnosis velocity over shipping a patch.",
              "layer2": "You may slow visible ‘progress’ while you learn.",
              "layer3": "Top PMs treat sudden drops as measurement or product events first."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Operators like Shreyas Doshi often separate signal from noise before committing engineering.",
              "whatTheyDid": ["Segmented the drop", "Validated instrumentation", "Then prioritized fixes"],
              "impact": ["Fewer false fixes", "Higher leverage work"],
              "videoUrl": null,
              "takeaway": "Speed without diagnosis burns trust."
            },
            "profileWeights": { "speedVsDepth": -0.25, "shortVsLong": -0.15, "riskVsConviction": -0.1 }
          },
          {
            "id": "c",
            "label": "Blame marketing: demand must be junk — tighten lead criteria now",
            "feedback": {
              "layer1": "You protected the product narrative by shifting blame upstream.",
              "layer2": "Sometimes true — sometimes it avoids owning the activation path.",
              "layer3": "Great operators align GTM and product on one shared definition of activation."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Strong GTM/product pairs run joint retros on cohort quality vs product friction.",
              "whatTheyDid": ["Shared definitions", "Aligned experiments", "Avoided silo warfare"],
              "impact": ["Faster truth", "Less politics"],
              "videoUrl": null,
              "takeaway": "Org tension is a symptom — alignment is the lever."
            },
            "profileWeights": { "speedVsDepth": 0.2, "shortVsLong": 0.25, "riskVsConviction": 0.35 }
          }
        ]
      },
      {
        "prompt": "Your CEO wants to ‘relaunch’ activation with a press moment. Engineering wants two sprints to remove a brutal setup step. Pick the tradeoff.",
        "choices": [
          {
            "id": "a",
            "label": "Split the baby: small launch + one sprint on setup",
            "feedback": {
              "layer1": "You negotiated optics and substance.",
              "layer2": "Splitting can mean neither side wins enough.",
              "layer3": "Operators often pick one thesis per quarter."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Seasoned builders avoid half-commitments that confuse the market and the team.",
              "whatTheyDid": ["Named a single priority", "Aligned metrics", "Communicated clearly"],
              "impact": ["Less thrash", "Cleaner learning"],
              "videoUrl": null,
              "takeaway": "Clarity beats compromise when stakes are high."
            },
            "profileWeights": { "speedVsDepth": 0.1, "shortVsLong": 0.05, "riskVsConviction": 0 }
          },
          {
            "id": "b",
            "label": "No launch until setup is fixed — silent improvement week",
            "feedback": {
              "layer1": "You chose durability over narrative.",
              "layer2": "You may absorb short-term pressure from sales/marketing.",
              "layer3": "This is how product-led teams rebuild trust in the funnel."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Leaders who shipped durable fixes often accepted quiet quarters.",
              "whatTheyDid": ["Protected roadmap integrity", "Measured activation honestly"],
              "impact": ["Compounding improvements"],
              "videoUrl": null,
              "takeaway": "Silence can be strategy."
            },
            "profileWeights": { "speedVsDepth": -0.35, "shortVsLong": -0.3, "riskVsConviction": -0.2 }
          },
          {
            "id": "c",
            "label": "Launch big — pressure creates focus",
            "feedback": {
              "layer1": "You used external commitment to force execution.",
              "layer2": "Deadlines can ship debt.",
              "layer3": "Operators use deadlines when the plan is already crisp."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "High-tempo launches work when the team agrees what ‘done’ means.",
              "whatTheyDid": ["Defined success metrics", "Cut scope", "Ritualed postmortems"],
              "impact": ["Momentum", "Risk if unclear"],
              "videoUrl": null,
              "takeaway": "Pressure amplifies whatever you already are."
            },
            "profileWeights": { "speedVsDepth": 0.4, "shortVsLong": 0.35, "riskVsConviction": 0.25 }
          }
        ]
      },
      {
        "prompt": "Data says onboarding time improved; qualitative research says users feel ‘lost’. What do you trust?",
        "choices": [
          {
            "id": "a",
            "label": "Trust the metrics — feelings lag reality",
            "feedback": {
              "layer1": "You anchored on quantified movement.",
              "layer2": "Feelings can be early signal of churn.",
              "layer3": "Best teams reconcile quant + qual with a single story."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "PMs respected in growth orgs triangulate — they don’t pick a camp.",
              "whatTheyDid": ["Interviewed users in the metric cohort", "Compared segments"],
              "impact": ["Better narrative", "Fewer blind spots"],
              "videoUrl": null,
              "takeaway": "Metrics tell what; qual tells why."
            },
            "profileWeights": { "speedVsDepth": 0.15, "shortVsLong": 0.2, "riskVsConviction": 0.25 }
          },
          {
            "id": "b",
            "label": "Pause releases — run 10 live sessions this week",
            "feedback": {
              "layer1": "You privileged lived experience over dashboards.",
              "layer2": "Slower shipping short-term.",
              "layer3": "This is how you find the ‘lost’ that metrics smooth out."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Ethnography-first debugging shows up repeatedly in operator playbooks.",
              "whatTheyDid": ["Watched real workflows", "Fixed language and affordances"],
              "impact": ["Higher comprehension", "Better retention"],
              "videoUrl": null,
              "takeaway": "Confusion is a product bug."
            },
            "profileWeights": { "speedVsDepth": -0.3, "shortVsLong": -0.2, "riskVsConviction": -0.15 }
          },
          {
            "id": "c",
            "label": "Instrument new events — the dashboard is lying",
            "feedback": {
              "layer1": "You suspected measurement drift.",
              "layer2": "Instrumentation takes time while users churn.",
              "layer3": "Operators validate analytics when the world stops making sense."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Data leaders insist on event correctness before debating strategy.",
              "whatTheyDid": ["Audited pipelines", "Named canonical events"],
              "impact": ["Trustworthy learning loops"],
              "videoUrl": null,
              "takeaway": "Bad data makes smart people look dumb."
            },
            "profileWeights": { "speedVsDepth": -0.1, "shortVsLong": 0, "riskVsConviction": 0 }
          }
        ]
      },
      {
        "prompt": "Sales says deals stall because onboarding is ‘too product-led’. They want a human assist. Product says that will crush margins.",
        "choices": [
          {
            "id": "a",
            "label": "Pilot white-glove for top ACV only — measure expansion",
            "feedback": {
              "layer1": "You segmented by value and tested a thesis.",
              "layer2": "Operational complexity increases.",
              "layer3": "Operators use pilots to learn pricing and packaging."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Enterprise motion often starts with narrow, high-touch slices.",
              "whatTheyDid": ["Defined ICP for assist", "Tracked unit economics"],
              "impact": ["Learned willingness to pay"],
              "videoUrl": null,
              "takeaway": "Pilot beats debate."
            },
            "profileWeights": { "speedVsDepth": 0, "shortVsLong": 0.1, "riskVsConviction": 0.1 }
          },
          {
            "id": "b",
            "label": "Refuse — fix the product so humans aren’t a crutch",
            "feedback": {
              "layer1": "You defended scalable product principles.",
              "layer2": "You may strain GTM relationships short-term.",
              "layer3": "Sometimes humans are the right bridge while you fix the core."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Balancing PLG and sales-assist is a recurring operator tension.",
              "whatTheyDid": ["Shared revenue goals", "Time-boxed experiments"],
              "impact": ["Aligned incentives"],
              "videoUrl": null,
              "takeaway": "Principles need a bridge to reality."
            },
            "profileWeights": { "speedVsDepth": -0.15, "shortVsLong": -0.25, "riskVsConviction": 0.2 }
          },
          {
            "id": "c",
            "label": "Revenue buys lunch — give sales the assist for one quarter",
            "feedback": {
              "layer1": "You optimized for near-term revenue capture.",
              "layer2": "Can hide whether the product works unassisted.",
              "layer3": "Operators set sunset clauses on non-scale crutches."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Temporary assists are common — permanence without proof is not.",
              "whatTheyDid": ["Set exit criteria", "Tracked assisted vs unassisted conversion"],
              "impact": ["Honest read on PMF"],
              "videoUrl": null,
              "takeaway": "Crutches need an expiry date."
            },
            "profileWeights": { "speedVsDepth": 0.3, "shortVsLong": 0.35, "riskVsConviction": 0.15 }
          }
        ]
      },
      {
        "prompt": "Final round: You can only pick one metric to own for the next 30 days. What’s the lever?",
        "choices": [
          {
            "id": "a",
            "label": "Time-to-first-success in the product",
            "feedback": {
              "layer1": "You bet on core product value.",
              "layer2": "Ignores top-of-funnel if acquisition broke.",
              "layer3": "Operators pick metrics that match the diagnosed bottleneck."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Great teams align one north star per season — not twelve.",
              "whatTheyDid": ["Chose one lever", "Ritualed review"],
              "impact": ["Focus compounds"],
              "videoUrl": null,
              "takeaway": "One lever, honestly owned."
            },
            "profileWeights": { "speedVsDepth": -0.2, "shortVsLong": -0.15, "riskVsConviction": 0 }
          },
          {
            "id": "b",
            "label": "Qualified signup volume",
            "feedback": {
              "layer1": "You fed the top of the funnel.",
              "layer2": "Can pour water into a leaky bucket.",
              "layer3": "Works when activation is healthy."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Growth leaders push volume when conversion is stable.",
              "whatTheyDid": ["Validated conversion first", "Scaled spend second"],
              "impact": ["Efficient growth"],
              "videoUrl": null,
              "takeaway": "Volume loves a tight funnel."
            },
            "profileWeights": { "speedVsDepth": 0.25, "shortVsLong": 0.3, "riskVsConviction": 0.2 }
          },
          {
            "id": "c",
            "label": "Retention D30 — truth about value",
            "feedback": {
              "layer1": "You optimized for staying power.",
              "layer2": "Slower feedback loop than activation.",
              "layer3": "Operators pick retention when they believe PMF is the question."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Retention is where product and GTM meet.",
              "whatTheyDid": ["Cohort analysis", "Churn interviews"],
              "impact": ["Strategic clarity"],
              "videoUrl": null,
              "takeaway": "Sticky beats loud."
            },
            "profileWeights": { "speedVsDepth": -0.25, "shortVsLong": -0.35, "riskVsConviction": -0.1 }
          }
        ]
      }
    ]$json$::jsonb,
    12,
    true,
    1
  )
  ON CONFLICT (podcast_id, slug) DO NOTHING;

  INSERT INTO public.simulation_definitions (
    podcast_id, slug, track, title, teaser, cover_emoji, rounds, estimated_minutes, published, display_order
  )
  VALUES (
    pid,
    'growth-without-spend',
    'growth',
    'Growth Without the Spend',
    'When the channel that worked stops working — and the board still wants the curve.',
    '📈',
    $json2$[
      {
        "prompt": "Organic traffic flattened for 6 weeks. Paid is capped. Leadership wants ‘growth ideas’ by Friday. What’s your play?",
        "choices": [
          {
            "id": "a",
            "label": "Launch a referral program with a bold reward",
            "feedback": {
              "layer1": "You engineered word-of-mouth with incentives.",
              "layer2": "Rewards attract bargain hunters if product love isn’t there.",
              "layer3": "Operators validate delight before paying for distribution."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Referral programs amplify retention — they rarely create it.",
              "whatTheyDid": ["Measured NPS in core users", "Then scaled invites"],
              "impact": ["Lower CAC when it works"],
              "videoUrl": null,
              "takeaway": "Love first, leverage second."
            },
            "profileWeights": { "speedVsDepth": 0.3, "shortVsLong": 0.25, "riskVsConviction": 0.2 }
          },
          {
            "id": "b",
            "label": "Pick one niche and own it editorially for 30 days",
            "feedback": {
              "layer1": "You chose depth and narrative over hacks.",
              "layer2": "Slower headline numbers.",
              "layer3": "Contrarian growth often starts with a sharp wedge."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Founders who won organic often dominated a conversation, not a channel.",
              "whatTheyDid": ["Chose a wedge", "Published consistently"],
              "impact": ["Compounding authority"],
              "videoUrl": null,
              "takeaway": "Own a story, not a tactic."
            },
            "profileWeights": { "speedVsDepth": -0.2, "shortVsLong": -0.3, "riskVsConviction": 0.1 }
          },
          {
            "id": "c",
            "label": "Double down on conversion — squeeze more from the same traffic",
            "feedback": {
              "layer1": "You mined existing demand.",
              "layer2": "Ignores new demand creation.",
              "layer3": "Smart when acquisition is expensive and traffic is qualified."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Growth teams often fix the room before buying a bigger house.",
              "whatTheyDid": ["Funnel teardown", "A/B on activation"],
              "impact": ["Efficient growth"],
              "videoUrl": null,
              "takeaway": "Efficiency is a strategy."
            },
            "profileWeights": { "speedVsDepth": 0.1, "shortVsLong": 0.15, "riskVsConviction": -0.05 }
          }
        ]
      },
      {
        "prompt": "A viral post brought junk signups. Conversion looks ‘up’ but revenue per signup is down. What do you report?",
        "choices": [
          {
            "id": "a",
            "label": "Report gross signups — momentum matters",
            "feedback": {
              "layer1": "You sold the headline.",
              "layer2": "Can mislead the org.",
              "layer3": "Operators separate vanity from value."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Board-ready metrics tie to revenue and retention.",
              "whatTheyDid": ["Showed qualified pipeline", "Segmented cohorts"],
              "impact": ["Better decisions"],
              "videoUrl": null,
              "takeaway": "Honesty beats vanity."
            },
            "profileWeights": { "speedVsDepth": 0.25, "shortVsLong": 0.3, "riskVsConviction": 0.3 }
          },
          {
            "id": "b",
            "label": "Report qualified activation + revenue per qualified signup",
            "feedback": {
              "layer1": "You chose truth over optics.",
              "layer2": "Harder story short-term.",
              "layer3": "This is how trust compounds."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Leaders who survived hype cycles anchored on quality signals.",
              "whatTheyDid": ["Defined quality bar", "Filtered reporting"],
              "impact": ["Aligned teams"],
              "videoUrl": null,
              "takeaway": "Clarity is leadership."
            },
            "profileWeights": { "speedVsDepth": -0.15, "shortVsLong": -0.2, "riskVsConviction": -0.1 }
          },
          {
            "id": "c",
            "label": "Kill the campaign landing page — protect the brand",
            "feedback": {
              "layer1": "You protected positioning.",
              "layer2": "May overreact if some junk converts.",
              "layer3": "Operators balance brand and learning."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Brand and growth trade off — great teams time-box experiments.",
              "whatTheyDid": ["Measured incremental revenue", "Set guardrails"],
              "impact": ["Controlled risk"],
              "videoUrl": null,
              "takeaway": "Protect, but don’t blind yourself."
            },
            "profileWeights": { "speedVsDepth": 0, "shortVsLong": 0.1, "riskVsConviction": 0.15 }
          }
        ]
      },
      {
        "prompt": "Partnerships want co-marketing; product worries roadmap debt. Pick.",
        "choices": [
          {
            "id": "a",
            "label": "One lightweight integration + joint webinar",
            "feedback": {
              "layer1": "You bought distribution with a bounded bet.",
              "layer2": "Still consumes focus.",
              "layer3": "Operators scope partnerships like products."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "The best partnerships have crisp mutual wins and exit criteria.",
              "whatTheyDid": ["Defined success", "Time-boxed"],
              "impact": ["Learning without lock-in"],
              "videoUrl": null,
              "takeaway": "Scope is strategy."
            },
            "profileWeights": { "speedVsDepth": 0.1, "shortVsLong": 0.1, "riskVsConviction": 0.05 }
          },
          {
            "id": "b",
            "label": "No — build the wedge; partnerships come after pull",
            "feedback": {
              "layer1": "You prioritized product pull.",
              "layer2": "May miss distribution windows.",
              "layer3": "Classic tension — timing matters."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Some teams defer partnerships until the core loop is undeniable.",
              "whatTheyDid": ["Said no with clarity", "Revisited later"],
              "impact": ["Protected focus"],
              "videoUrl": null,
              "takeaway": "No is a roadmap item."
            },
            "profileWeights": { "speedVsDepth": -0.2, "shortVsLong": -0.25, "riskVsConviction": 0.1 }
          },
          {
            "id": "c",
            "label": "Full partnership — growth needs a hero bet",
            "feedback": {
              "layer1": "You swung for leverage.",
              "layer2": "Hero bets can become tar pits.",
              "layer3": "Operators stage risk when uncertainty is high."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Big bets work when the thesis is shared and measurable.",
              "whatTheyDid": ["Aligned execs", "Defined kill criteria"],
              "impact": ["Upside with guardrails"],
              "videoUrl": null,
              "takeaway": "Hero bets need kill switches."
            },
            "profileWeights": { "speedVsDepth": 0.35, "shortVsLong": 0.3, "riskVsConviction": 0.35 }
          }
        ]
      },
      {
        "prompt": "Board asks for a ‘growth forecast’. You don’t believe the model. What do you do?",
        "choices": [
          {
            "id": "a",
            "label": "Present the model with confidence — revise later",
            "feedback": {
              "layer1": "You protected short-term harmony.",
              "layer2": "Credibility risk when reality hits.",
              "layer3": "Operators separate forecasts from commitments."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Trust is built on ranges, assumptions, and what would change them.",
              "whatTheyDid": ["Scenario planning", "Named risks"],
              "impact": ["Better board conversations"],
              "videoUrl": null,
              "takeaway": "Precision beats performance."
            },
            "profileWeights": { "speedVsDepth": 0.2, "shortVsLong": 0.25, "riskVsConviction": 0.25 }
          },
          {
            "id": "b",
            "label": "Show ranges + assumptions — refuse false precision",
            "feedback": {
              "layer1": "You chose intellectual honesty.",
              "layer2": "Uncomfortable in the room.",
              "layer3": "This is how durable leadership shows up."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "The best forecasts expose uncertainty — they don’t hide it.",
              "whatTheyDid": ["Sensitivity analysis", "Leading indicators"],
              "impact": ["Smarter capital allocation"],
              "videoUrl": null,
              "takeaway": "Ranges are respect."
            },
            "profileWeights": { "speedVsDepth": -0.25, "shortVsLong": -0.2, "riskVsConviction": -0.2 }
          },
          {
            "id": "c",
            "label": "Delay the meeting until the model is defensible",
            "feedback": {
              "layer1": "You bought time for rigor.",
              "layer2": "Can frustrate governance.",
              "layer3": "Operators communicate why delay reduces risk."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Good delays come with a plan and a date.",
              "whatTheyDid": ["Named deliverables", "Committed timeline"],
              "impact": ["Trust through process"],
              "videoUrl": null,
              "takeaway": "Delay with a contract."
            },
            "profileWeights": { "speedVsDepth": -0.1, "shortVsLong": -0.15, "riskVsConviction": -0.15 }
          }
        ]
      },
      {
        "prompt": "Last call: you get one experiment budget. Pick.",
        "choices": [
          {
            "id": "a",
            "label": "Paid experiment on a new channel",
            "feedback": {
              "layer1": "You hunted new demand.",
              "layer2": "Spend risk.",
              "layer3": "Operators run paid tests with clear stop rules."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Paid acquisition is a scalpel when measurement is clean.",
              "whatTheyDid": ["Clean tracking", "Stop rules"],
              "impact": ["Fast learning"],
              "videoUrl": null,
              "takeaway": "Pay for learning, not hope."
            },
            "profileWeights": { "speedVsDepth": 0.2, "shortVsLong": 0.2, "riskVsConviction": 0.15 }
          },
          {
            "id": "b",
            "label": "Product experiment on onboarding friction",
            "feedback": {
              "layer1": "You improved the core loop.",
              "layer2": "Doesn’t add new traffic.",
              "layer3": "Often highest ROI when conversion is the bottleneck."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Fixing activation is the quietest growth hack.",
              "whatTheyDid": ["Mapped steps", "Removed friction"],
              "impact": ["Compounding conversion"],
              "videoUrl": null,
              "takeaway": "Fix the hole before filling the bucket."
            },
            "profileWeights": { "speedVsDepth": -0.15, "shortVsLong": -0.2, "riskVsConviction": -0.1 }
          },
          {
            "id": "c",
            "label": "Community / content sprint to rekindle organic",
            "feedback": {
              "layer1": "You invested in compounding distribution.",
              "layer2": "Slower payback.",
              "layer3": "Operators do this when they believe narrative + trust drive conversion."
            },
            "layer4_static": {
              "headline": "How real operators approached this",
              "operatorLine": "Brand and community are lagging indicators — but durable.",
              "whatTheyDid": ["Consistent publishing", "Engaged power users"],
              "impact": ["Long-term demand"],
              "videoUrl": null,
              "takeaway": "Compounding is a decision."
            },
            "profileWeights": { "speedVsDepth": -0.25, "shortVsLong": -0.35, "riskVsConviction": 0 }
          }
        ]
      }
    ]$json2$::jsonb,
    12,
    true,
    2
  )
  ON CONFLICT (podcast_id, slug) DO NOTHING;

  END IF;
END $$;
