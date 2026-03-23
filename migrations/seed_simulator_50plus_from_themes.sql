-- Seed ~50 additional simulator scenarios (theme-first).
-- Uses only the main tracks:
--   product, growth, strategy, leadership, mixed
--
-- Theme selection strategy:
-- 1) Pull theme labels from knowledge_graph_cache (if available)
-- 2) Fall back to curated defaults
--
-- Safe to re-run (ON CONFLICT DO NOTHING).

DO $$
DECLARE
  pid uuid;
  graph_themes text[];
  t text;
  i int;
  theme_label text;
  sim_slug text;
  sim_title text;
  sim_teaser text;
  sim_emoji text;
  display_base int := 200;
  rounds jsonb;

  product_themes text[] := ARRAY[
    'Activation', 'Onboarding', 'Pricing', 'Retention', 'Roadmap',
    'User Research', 'Product-Market Fit', 'Segmentation', 'Funnel Friction', 'Quality'
  ];
  growth_themes text[] := ARRAY[
    'Acquisition', 'Distribution', 'Referrals', 'SEO', 'Monetization',
    'Lifecycle', 'Paid Channels', 'Content Loops', 'Conversion', 'Virality'
  ];
  strategy_themes text[] := ARRAY[
    'Market Timing', 'Positioning', 'Competitive Moats', 'Focus', 'Expansion',
    'Category Design', 'Portfolio Bets', 'Resource Allocation', 'Optionality', 'Risk'
  ];
  leadership_themes text[] := ARRAY[
    'Hiring', 'Decision Velocity', 'Team Alignment', 'Ownership', 'Feedback Culture',
    'Conflict Resolution', 'Manager Leverage', 'Org Design', 'Trust', 'Accountability'
  ];
  mixed_themes text[];
BEGIN
  SELECT id INTO pid
  FROM public.podcasts
  WHERE slug = 'lennys-podcast'
  LIMIT 1;

  IF pid IS NULL THEN
    RAISE NOTICE 'seed_simulator_50plus_from_themes: podcast lennys-podcast not found; skipping';
    RETURN;
  END IF;

  -- Pull top theme labels from knowledge graph cache when present.
  SELECT array_agg(DISTINCT trim(n->>'label'))
  INTO graph_themes
  FROM public.knowledge_graph_cache kgc
  CROSS JOIN LATERAL jsonb_array_elements(kgc.graph_data->'nodes') n
  WHERE kgc.podcast_slug = 'lennys-podcast'
    AND n->>'type' = 'theme'
    AND n ? 'label'
    AND length(trim(n->>'label')) > 0;

  IF graph_themes IS NULL OR array_length(graph_themes, 1) < 10 THEN
    mixed_themes := ARRAY[
      'Execution under uncertainty', 'Founder-operator mindset', 'High-stakes communication',
      'Shipping discipline', 'Cross-functional alignment', 'Tradeoff quality',
      'Compounding decisions', 'Learning velocity', 'Resilience', 'Strategic clarity'
    ];
  ELSE
    mixed_themes := graph_themes[1:10];
  END IF;

  FOREACH t IN ARRAY ARRAY['product', 'growth', 'strategy', 'leadership', 'mixed']
  LOOP
    FOR i IN 1..10
    LOOP
      IF t = 'product' THEN
        theme_label := product_themes[((i - 1) % array_length(product_themes, 1)) + 1];
        sim_emoji := '🧩';
      ELSIF t = 'growth' THEN
        theme_label := growth_themes[((i - 1) % array_length(growth_themes, 1)) + 1];
        sim_emoji := '📈';
      ELSIF t = 'strategy' THEN
        theme_label := strategy_themes[((i - 1) % array_length(strategy_themes, 1)) + 1];
        sim_emoji := '🧭';
      ELSIF t = 'leadership' THEN
        theme_label := leadership_themes[((i - 1) % array_length(leadership_themes, 1)) + 1];
        sim_emoji := '🧠';
      ELSE
        theme_label := mixed_themes[((i - 1) % array_length(mixed_themes, 1)) + 1];
        sim_emoji := '⚖️';
      END IF;

      sim_slug := format(
        '%s-%s-%s',
        t,
        regexp_replace(lower(theme_label), '[^a-z0-9]+', '-', 'g'),
        lpad(i::text, 2, '0')
      );

      sim_title := format(
        '%s: %s',
        CASE t
          WHEN 'product' THEN 'Product Decision Drill'
          WHEN 'growth' THEN 'Growth Pressure Test'
          WHEN 'strategy' THEN 'Strategy Bet Lab'
          WHEN 'leadership' THEN 'Leadership Decision Room'
          ELSE 'Mixed Challenge Arena'
        END,
        theme_label
      );

      sim_teaser := format(
        'A high-stakes %s scenario around %s. Five decisions, no obvious right answer.',
        t,
        theme_label
      );

      rounds := jsonb_build_array(
        jsonb_build_object(
          'prompt',
          format(
            'You inherit a noisy dashboard in %s. Signals conflict and leadership wants action today. What is your first move on "%s"?',
            theme_label, theme_label
          ),
          'choices',
          jsonb_build_array(
            jsonb_build_object(
              'id','a',
              'label','Ship a visible fix this week to calm stakeholders',
              'feedback',jsonb_build_object(
                'layer1','You optimized for immediate momentum.',
                'layer2','Fast optics can hide root-cause gaps.',
                'layer3','Strong operators ship quickly only after framing what must be true.'
              ),
              'layer4_static',jsonb_build_object(
                'headline','How real operators approached this',
                'operatorLine','Top builders separate urgency from panic by naming one falsifiable hypothesis first.',
                'whatTheyDid',jsonb_build_array('Named the bottleneck','Set a one-week learning loop','Cut scope to signal'),
                'impact',jsonb_build_array('Clear ownership','Faster truth'),
                'videoUrl',NULL,
                'takeaway','Action is useful when anchored to a thesis.'
              ),
              'profileWeights',jsonb_build_object('speedVsDepth',0.3,'shortVsLong',0.2,'riskVsConviction',0.2),
              'citationQueryHint',format('Lennys podcast %s deciding quickly with incomplete data', theme_label)
            ),
            jsonb_build_object(
              'id','b',
              'label','Pause launches for 72 hours and diagnose cohorts deeply',
              'feedback',jsonb_build_object(
                'layer1','You optimized for clarity before commitment.',
                'layer2','You may absorb short-term pressure.',
                'layer3','Operators often earn speed later by buying precision early.'
              ),
              'layer4_static',jsonb_build_object(
                'headline','How real operators approached this',
                'operatorLine','Experienced PM and growth leaders repeatedly triangulate quant + qual before escalating spend.',
                'whatTheyDid',jsonb_build_array('Segmented cohorts','Validated instrumentation','Spoke to recent users'),
                'impact',jsonb_build_array('Higher confidence','Fewer false fixes'),
                'videoUrl',NULL,
                'takeaway','Diagnosis is an accelerator, not a delay.'
              ),
              'profileWeights',jsonb_build_object('speedVsDepth',-0.3,'shortVsLong',-0.2,'riskVsConviction',-0.1),
              'citationQueryHint',format('Lennys podcast %s cohort analysis and user interviews', theme_label)
            ),
            jsonb_build_object(
              'id','c',
              'label','Escalate ownership to another team and redefine the KPI',
              'feedback',jsonb_build_object(
                'layer1','You reduced local risk by shifting accountability.',
                'layer2','May protect your team but increase system drift.',
                'layer3','Great operators align on one metric contract before reallocating work.'
              ),
              'layer4_static',jsonb_build_object(
                'headline','How real operators approached this',
                'operatorLine','Cross-functional wins usually come from shared definitions, not handoffs.',
                'whatTheyDid',jsonb_build_array('Aligned KPI definitions','Set single-threaded owner','Created weekly review ritual'),
                'impact',jsonb_build_array('Less politics','Cleaner execution'),
                'videoUrl',NULL,
                'takeaway','Ownership clarity beats org theater.'
              ),
              'profileWeights',jsonb_build_object('speedVsDepth',0.15,'shortVsLong',0.25,'riskVsConviction',0.3),
              'citationQueryHint',format('Lennys podcast %s cross functional ownership alignment metric definitions', theme_label)
            )
          )
        ),
        jsonb_build_object(
          'prompt',
          format('A second-order effect appears: one metric improved, but downstream behavior worsened. What tradeoff do you choose for %s?', theme_label),
          'choices',
          jsonb_build_array(
            jsonb_build_object(
              'id','a','label','Double down on the improving metric for 30 days',
              'feedback',jsonb_build_object('layer1','You chose consistency.','layer2','Could optimize the wrong local maximum.','layer3','Operators define guardrails before scaling what appears to work.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Compounding comes from scaling proven loops with explicit downside checks.','whatTheyDid',jsonb_build_array('Set guardrails','Tracked counter-metrics'),'impact',jsonb_build_array('Controlled acceleration'),'videoUrl',NULL,'takeaway','Scale with constraints, not hope.'),
              'profileWeights',jsonb_build_object('speedVsDepth',0.25,'shortVsLong',0.2,'riskVsConviction',0.2),
              'citationQueryHint',format('Lennys podcast %s scaling after early signal with guardrails', theme_label)
            ),
            jsonb_build_object(
              'id','b','label','Rebalance targets to protect downstream quality',
              'feedback',jsonb_build_object('layer1','You protected durability.','layer2','Looks slower in weekly reporting.','layer3','Experienced operators trade optics for long-run quality when compounding is at stake.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','The best operators choose metrics that survive contact with reality.','whatTheyDid',jsonb_build_array('Reframed success criteria','Realigned incentives'),'impact',jsonb_build_array('Stronger long-term outcomes'),'videoUrl',NULL,'takeaway','Durability is a strategic decision.'),
              'profileWeights',jsonb_build_object('speedVsDepth',-0.2,'shortVsLong',-0.3,'riskVsConviction',-0.1),
              'citationQueryHint',format('Lennys podcast %s long term quality tradeoffs', theme_label)
            ),
            jsonb_build_object(
              'id','c','label','Run two competing bets with equal resources',
              'feedback',jsonb_build_object('layer1','You increased optionality.','layer2','Can diffuse attention and accountability.','layer3','Strong teams run parallel bets only with crisp stop rules.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Parallel experiments work when kill-criteria are pre-committed.','whatTheyDid',jsonb_build_array('Defined stop rules','Time-boxed experiments'),'impact',jsonb_build_array('Faster learning per cycle'),'videoUrl',NULL,'takeaway','Optionality needs discipline.'),
              'profileWeights',jsonb_build_object('speedVsDepth',0.1,'shortVsLong',0.05,'riskVsConviction',0.25),
              'citationQueryHint',format('Lennys podcast %s portfolio bets stop rules', theme_label)
            )
          )
        ),
        jsonb_build_object(
          'prompt',
          format('Stakeholders disagree on what "%s success" means. You have one meeting to reset alignment.', theme_label),
          'choices',
          jsonb_build_array(
            jsonb_build_object(
              'id','a','label','Choose one north-star metric and enforce it',
              'feedback',jsonb_build_object('layer1','You created focus.','layer2','You may ignore useful nuance.','layer3','Top operators simplify the scorecard, then add context in review.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','A single directional metric often unlocks speed across functions.','whatTheyDid',jsonb_build_array('Named one outcome','Shared metric contract'),'impact',jsonb_build_array('Faster decisions'),'videoUrl',NULL,'takeaway','A shared scorecard compounds trust.'),
              'profileWeights',jsonb_build_object('speedVsDepth',0.2,'shortVsLong',0.1,'riskVsConviction',0.15),
              'citationQueryHint',format('Lennys podcast %s north star metric alignment', theme_label)
            ),
            jsonb_build_object(
              'id','b','label','Run a 2-week alignment sprint before changing targets',
              'feedback',jsonb_build_object('layer1','You invested in shared understanding.','layer2','You delayed visible output.','layer3','Operators do this when organizational mismatch is the true bottleneck.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Alignment debt often costs more than shipping debt.','whatTheyDid',jsonb_build_array('Clarified terms','Mapped dependencies'),'impact',jsonb_build_array('Lower execution thrash'),'videoUrl',NULL,'takeaway','Ambiguity is an execution tax.'),
              'profileWeights',jsonb_build_object('speedVsDepth',-0.25,'shortVsLong',-0.2,'riskVsConviction',-0.05),
              'citationQueryHint',format('Lennys podcast %s team alignment and execution debt', theme_label)
            ),
            jsonb_build_object(
              'id','c','label','Let each function keep its own KPI, sync monthly',
              'feedback',jsonb_build_object('layer1','You preserved local autonomy.','layer2','Can fragment decision quality.','layer3','Great operators decentralize execution, not reality.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Autonomy works best when teams share common constraints.','whatTheyDid',jsonb_build_array('Defined non-negotiables','Kept local levers flexible'),'impact',jsonb_build_array('Clearer boundaries'),'videoUrl',NULL,'takeaway','Freedom needs shared constraints.'),
              'profileWeights',jsonb_build_object('speedVsDepth',0.05,'shortVsLong',0.25,'riskVsConviction',0.2),
              'citationQueryHint',format('Lennys podcast %s autonomy versus alignment tradeoff', theme_label)
            )
          )
        ),
        jsonb_build_object(
          'prompt',
          format('A major decision deadline lands this week. You can only optimize one lever for %s.', theme_label),
          'choices',
          jsonb_build_array(
            jsonb_build_object(
              'id','a','label','Optimize speed: ship smallest viable path',
              'feedback',jsonb_build_object('layer1','You prioritized momentum.','layer2','Can defer foundational risk.','layer3','Operators choose this when feedback speed is the strategic edge.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Fast loops win when teams preserve optionality for the next move.','whatTheyDid',jsonb_build_array('Cut scope hard','Predefined next iteration'),'impact',jsonb_build_array('Rapid signal'),'videoUrl',NULL,'takeaway','Ship for learning, not applause.'),
              'profileWeights',jsonb_build_object('speedVsDepth',0.35,'shortVsLong',0.25,'riskVsConviction',0.1),
              'citationQueryHint',format('Lennys podcast %s fast shipping for learning loops', theme_label)
            ),
            jsonb_build_object(
              'id','b','label','Optimize depth: remove highest structural risk first',
              'feedback',jsonb_build_object('layer1','You prioritized resilience.','layer2','Stakeholders may perceive slower progress.','layer3','Experienced operators protect foundations when downside is asymmetric.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Durable systems are often built in quiet quarters.','whatTheyDid',jsonb_build_array('Addressed root constraints','Protected engineering focus'),'impact',jsonb_build_array('Lower long-term volatility'),'videoUrl',NULL,'takeaway','Depth is speed over a longer horizon.'),
              'profileWeights',jsonb_build_object('speedVsDepth',-0.35,'shortVsLong',-0.3,'riskVsConviction',-0.1),
              'citationQueryHint',format('Lennys podcast %s long term durability versus short term speed', theme_label)
            ),
            jsonb_build_object(
              'id','c','label','Optimize narrative: align board and team around a bold bet',
              'feedback',jsonb_build_object('layer1','You used narrative as execution leverage.','layer2','Narrative without mechanism can drift fast.','layer3','Top operators tie story to measurable operational commitments.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Narrative is powerful when it sharpens decisions, not masks uncertainty.','whatTheyDid',jsonb_build_array('Connected strategy to metrics','Committed to review cadence'),'impact',jsonb_build_array('Stronger organizational coherence'),'videoUrl',NULL,'takeaway','Story should increase accountability.'),
              'profileWeights',jsonb_build_object('speedVsDepth',0.2,'shortVsLong',0.2,'riskVsConviction',0.3),
              'citationQueryHint',format('Lennys podcast %s strategy narrative tied to execution', theme_label)
            )
          )
        ),
        jsonb_build_object(
          'prompt',
          format('Final round: choose the operating principle you will defend for the next 30 days in %s.', theme_label),
          'choices',
          jsonb_build_array(
            jsonb_build_object(
              'id','a','label','One bottleneck, one owner, one weekly ritual',
              'feedback',jsonb_build_object('layer1','You chose disciplined focus.','layer2','May underinvest in adjacent opportunities.','layer3','Operators with consistent cadence often outperform louder teams.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Cadence beats intensity when uncertainty is high.','whatTheyDid',jsonb_build_array('Named bottleneck','Assigned owner','Reviewed weekly'),'impact',jsonb_build_array('Compounding execution quality'),'videoUrl',NULL,'takeaway','Rhythm is a strategic asset.'),
              'profileWeights',jsonb_build_object('speedVsDepth',-0.1,'shortVsLong',-0.2,'riskVsConviction',0.0),
              'citationQueryHint',format('Lennys podcast %s operating cadence and ownership', theme_label)
            ),
            jsonb_build_object(
              'id','b','label','Maximize experiment count with strict stop rules',
              'feedback',jsonb_build_object('layer1','You optimized learning throughput.','layer2','Can increase context switching.','layer3','Great operators pair high velocity with ruthless pruning.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','More bets only helps when kill criteria are real.','whatTheyDid',jsonb_build_array('Ran many tests','Killed fast','Scaled winners'),'impact',jsonb_build_array('Faster discovery'),'videoUrl',NULL,'takeaway','Volume needs discipline.'),
              'profileWeights',jsonb_build_object('speedVsDepth',0.25,'shortVsLong',0.15,'riskVsConviction',0.2),
              'citationQueryHint',format('Lennys podcast %s experimentation velocity stop criteria', theme_label)
            ),
            jsonb_build_object(
              'id','c','label','Protect team capacity and cut lower-leverage work',
              'feedback',jsonb_build_object('layer1','You defended attention as a scarce asset.','layer2','Can disappoint teams expecting broad progress.','layer3','Strong operators know strategy is often subtraction.'),
              'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Execution quality rises when teams stop doing low-leverage work.','whatTheyDid',jsonb_build_array('Killed low ROI projects','Reallocated focus'),'impact',jsonb_build_array('Higher leverage per cycle'),'videoUrl',NULL,'takeaway','Subtraction creates strategic room.'),
              'profileWeights',jsonb_build_object('speedVsDepth',-0.2,'shortVsLong',-0.1,'riskVsConviction',0.1),
              'citationQueryHint',format('Lennys podcast %s focus by saying no', theme_label)
            )
          )
        )
      );

      INSERT INTO public.simulation_definitions (
        podcast_id,
        slug,
        track,
        title,
        teaser,
        cover_emoji,
        rounds,
        estimated_minutes,
        published,
        display_order
      )
      VALUES (
        pid,
        sim_slug,
        t,
        sim_title,
        sim_teaser,
        sim_emoji,
        rounds,
        8,
        true,
        display_base
        + CASE t
            WHEN 'product' THEN 0
            WHEN 'growth' THEN 100
            WHEN 'strategy' THEN 200
            WHEN 'leadership' THEN 300
            ELSE 400
          END
        + i
      )
      ON CONFLICT (podcast_id, slug) DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'seed_simulator_50plus_from_themes: completed';
END $$;

