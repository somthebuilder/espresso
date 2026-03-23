-- Force-refresh generated 50 simulator scenarios with more varied prompts.
-- Safe to re-run. Preserves handcrafted slugs that do not end in -NN.

DO $$
DECLARE
  pid uuid;
  t text;
  i int;
  theme_label text;
  sim_slug text;
  sim_title text;
  sim_teaser text;
  rounds jsonb;
  opener text;
  product_themes text[] := ARRAY['Activation','Onboarding','Pricing','Retention','Roadmap','User Research','Product-Market Fit','Segmentation','Funnel Friction','Quality'];
  growth_themes text[] := ARRAY['Acquisition','Distribution','Referrals','SEO','Monetization','Lifecycle','Paid Channels','Content Loops','Conversion','Virality'];
  strategy_themes text[] := ARRAY['Market Timing','Positioning','Competitive Moats','Focus','Expansion','Category Design','Portfolio Bets','Resource Allocation','Optionality','Risk'];
  leadership_themes text[] := ARRAY['Hiring','Decision Velocity','Team Alignment','Ownership','Feedback Culture','Conflict Resolution','Manager Leverage','Org Design','Trust','Accountability'];
  mixed_themes text[] := ARRAY['Execution under uncertainty','Founder-operator mindset','High-stakes communication','Shipping discipline','Cross-functional alignment','Tradeoff quality','Compounding decisions','Learning velocity','Resilience','Strategic clarity'];
  opener_pool text[] := ARRAY[
    'Signal is messy and pressure is real.',
    'Your team has partial data and a hard deadline.',
    'Evidence conflicts and everyone wants a fast call.',
    'You have one operating window to set direction.',
    'A visible metric moved, but root cause is unclear.'
  ];
BEGIN
  SELECT id INTO pid FROM public.podcasts WHERE slug = 'lennys-podcast' LIMIT 1;
  IF pid IS NULL THEN
    RAISE NOTICE 'refresh_simulator_50plus_content_v2: podcast not found; skipping';
    RETURN;
  END IF;

  DELETE FROM public.simulation_definitions
  WHERE podcast_id = pid
    AND slug ~ '^[a-z0-9-]+-[0-9]{2}$'
    AND track IN ('product', 'growth', 'strategy', 'leadership', 'mixed');

  FOREACH t IN ARRAY ARRAY['product', 'growth', 'strategy', 'leadership', 'mixed']
  LOOP
    FOR i IN 1..10
    LOOP
      IF t = 'product' THEN
        theme_label := product_themes[i];
      ELSIF t = 'growth' THEN
        theme_label := growth_themes[i];
      ELSIF t = 'strategy' THEN
        theme_label := strategy_themes[i];
      ELSIF t = 'leadership' THEN
        theme_label := leadership_themes[i];
      ELSE
        theme_label := mixed_themes[i];
      END IF;

      opener := opener_pool[((i - 1) % array_length(opener_pool, 1)) + 1];

      sim_slug := format('%s-%s-%s', t, regexp_replace(lower(theme_label), '[^a-z0-9]+', '-', 'g'), lpad(i::text, 2, '0'));
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
      sim_teaser := format('%s Theme: %s. Five decisions, no obvious right answer.', opener, theme_label);

      rounds := jsonb_build_array(
        jsonb_build_object(
          'prompt', format('%s Round 1 - Diagnosis: For "%s", what is the first action you take to reduce uncertainty?', opener, theme_label),
          'choices', jsonb_build_array(
            jsonb_build_object('id','a','label','Commit to a fast working thesis and test it in 48 hours','feedback',jsonb_build_object('layer1','You created momentum quickly.','layer2','Risk: early anchoring bias.','layer3','Top operators keep fast hypotheses reversible.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Leaders often start with explicit assumptions and short feedback loops.','whatTheyDid',jsonb_build_array('Named assumptions','Set check-ins'),'impact',jsonb_build_array('Faster alignment'),'videoUrl',NULL,'takeaway','Move fast, but make assumptions explicit.'),'profileWeights',jsonb_build_object('speedVsDepth',0.2,'shortVsLong',0.1,'riskVsConviction',0.15),'citationQueryHint',format('lennys podcast %s diagnosis assumptions evidence', theme_label)),
            jsonb_build_object('id','b','label','Pause shipping for 72 hours to isolate the root cause','feedback',jsonb_build_object('layer1','You prioritized decision quality.','layer2','Risk: perceived slowdown.','layer3','Short diagnostic pauses can improve total velocity.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Strong teams separate signal from noise before scaling action.','whatTheyDid',jsonb_build_array('Segmented cohorts','Validated instrumentation'),'impact',jsonb_build_array('Better decisions'),'videoUrl',NULL,'takeaway','Diagnosis is leverage.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.25,'shortVsLong',-0.2,'riskVsConviction',-0.1),'citationQueryHint',format('lennys podcast %s root cause cohort analysis', theme_label)),
            jsonb_build_object('id','c','label','Escalate the decision and ask for an executive call','feedback',jsonb_build_object('layer1','You optimized for clarity of authority.','layer2','Risk: weak local ownership.','layer3','Great operators escalate constraints, not accountability.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','High-trust teams ask for constraints and keep ownership local.','whatTheyDid',jsonb_build_array('Clarified decision rights','Kept owner clear'),'impact',jsonb_build_array('Less thrash'),'videoUrl',NULL,'takeaway','Escalate context, keep ownership.'),'profileWeights',jsonb_build_object('speedVsDepth',0.1,'shortVsLong',0.2,'riskVsConviction',0.25),'citationQueryHint',format('lennys podcast %s decision ownership escalation', theme_label))
          )
        ),
        jsonb_build_object(
          'prompt', format('Round 2 - Resource bet: You can fund one path for "%s" this sprint. Where do you place the bet?', theme_label),
          'choices', jsonb_build_array(
            jsonb_build_object('id','a','label','Prioritize near-term lift that moves the weekly number','feedback',jsonb_build_object('layer1','You optimized for immediate movement.','layer2','Risk: local maxima.','layer3','Best operators pair quick wins with guardrails.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Fast gains are strongest when paired with anti-regret metrics.','whatTheyDid',jsonb_build_array('Set counter-metrics','Time-boxed tests'),'impact',jsonb_build_array('Controlled acceleration'),'videoUrl',NULL,'takeaway','Short-term wins need guardrails.'),'profileWeights',jsonb_build_object('speedVsDepth',0.2,'shortVsLong',0.25,'riskVsConviction',0.1),'citationQueryHint',format('lennys podcast %s short term versus long term tradeoff', theme_label)),
            jsonb_build_object('id','b','label','Invest in a structural fix with slower visible payoff','feedback',jsonb_build_object('layer1','You chose durability over optics.','layer2','Risk: short-term pressure.','layer3','Compounding systems usually need protected focus.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Quiet foundational work often unlocks multi-quarter leverage.','whatTheyDid',jsonb_build_array('Protected roadmap','Aligned long metric'),'impact',jsonb_build_array('Compounding outcomes'),'videoUrl',NULL,'takeaway','Compounding is a deliberate choice.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.2,'shortVsLong',-0.3,'riskVsConviction',-0.1),'citationQueryHint',format('lennys podcast %s foundational investment compounding', theme_label)),
            jsonb_build_object('id','c','label','Run two smaller bets to preserve optionality','feedback',jsonb_build_object('layer1','You maximized learning surface area.','layer2','Risk: diluted focus.','layer3','Portfolio bets work with strict kill criteria.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Parallel bets need clear stop rules to avoid drift.','whatTheyDid',jsonb_build_array('Set kill criteria','Reviewed quickly'),'impact',jsonb_build_array('Faster learning'),'videoUrl',NULL,'takeaway','Optionality needs discipline.'),'profileWeights',jsonb_build_object('speedVsDepth',0.05,'shortVsLong',0.1,'riskVsConviction',0.25),'citationQueryHint',format('lennys podcast %s portfolio bets stop rules', theme_label))
          )
        ),
        jsonb_build_object(
          'prompt', format('Round 3 - Alignment conflict: Stakeholders disagree on success for "%s". How do you reset execution?', theme_label),
          'choices', jsonb_build_array(
            jsonb_build_object('id','a','label','Set one shared metric contract for all teams','feedback',jsonb_build_object('layer1','You created cross-functional clarity.','layer2','Risk: less local nuance.','layer3','Shared truth usually increases execution velocity.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','A common scorecard reduces politics and ambiguity.','whatTheyDid',jsonb_build_array('Aligned definitions','Ritualized review'),'impact',jsonb_build_array('Faster decisions'),'videoUrl',NULL,'takeaway','Shared definitions are infrastructure.'),'profileWeights',jsonb_build_object('speedVsDepth',0.15,'shortVsLong',0.1,'riskVsConviction',0.1),'citationQueryHint',format('lennys podcast %s cross functional metric alignment', theme_label)),
            jsonb_build_object('id','b','label','Run a short alignment sprint before resetting targets','feedback',jsonb_build_object('layer1','You invested in execution quality.','layer2','Risk: immediate frustration.','layer3','Alignment debt is often the hidden bottleneck.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','When teams use different realities, speed amplifies waste.','whatTheyDid',jsonb_build_array('Mapped assumptions','Resolved incentives'),'impact',jsonb_build_array('Cleaner execution'),'videoUrl',NULL,'takeaway','Alignment work is core work.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.2,'shortVsLong',-0.1,'riskVsConviction',-0.05),'citationQueryHint',format('lennys podcast %s alignment debt incentives', theme_label)),
            jsonb_build_object('id','c','label','Keep team KPIs but enforce strict monthly governance','feedback',jsonb_build_object('layer1','You preserved team autonomy.','layer2','Risk: slower conflict detection.','layer3','Autonomy scales with clear constraints.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Good operators decentralize tactics, not objective reality.','whatTheyDid',jsonb_build_array('Set constraints','Kept flexibility'),'impact',jsonb_build_array('Balanced ownership'),'videoUrl',NULL,'takeaway','Autonomy needs boundaries.'),'profileWeights',jsonb_build_object('speedVsDepth',0.05,'shortVsLong',0.2,'riskVsConviction',0.2),'citationQueryHint',format('lennys podcast %s autonomy with constraints', theme_label))
          )
        ),
        jsonb_build_object(
          'prompt', format('Round 4 - Constraint shock: Capacity drops 30%% while "%s" goals stay fixed. What operating move do you make?', theme_label),
          'choices', jsonb_build_array(
            jsonb_build_object('id','a','label','Cut scope hard and preserve delivery rhythm','feedback',jsonb_build_object('layer1','You protected momentum.','layer2','Risk: debt build-up.','layer3','Scope cuts work best with explicit debt cleanup.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','The strongest teams shrink scope, not standards.','whatTheyDid',jsonb_build_array('Named must-haves','Scheduled cleanup'),'impact',jsonb_build_array('Maintained cadence'),'videoUrl',NULL,'takeaway','Scope is a lever, quality is not.'),'profileWeights',jsonb_build_object('speedVsDepth',0.25,'shortVsLong',0.2,'riskVsConviction',0.1),'citationQueryHint',format('lennys podcast %s scope cuts quality guardrails', theme_label)),
            jsonb_build_object('id','b','label','Freeze new bets and de-risk foundations first','feedback',jsonb_build_object('layer1','You prioritized downside protection.','layer2','Risk: slower optics.','layer3','Quiet foundation work can unlock future speed.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Resilience choices often look slow before they compound.','whatTheyDid',jsonb_build_array('Protected deep work','Reduced systemic risk'),'impact',jsonb_build_array('Lower volatility'),'videoUrl',NULL,'takeaway','Resilience is a growth strategy.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.3,'shortVsLong',-0.25,'riskVsConviction',-0.1),'citationQueryHint',format('lennys podcast %s reduce risk under constraints', theme_label)),
            jsonb_build_object('id','c','label','Renegotiate goals with a tighter narrative and milestones','feedback',jsonb_build_object('layer1','You used narrative to preserve ambition.','layer2','Risk: credibility loss if miss.','layer3','Narrative works when tied to operating changes.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Strong leaders link story to observable operating behavior.','whatTheyDid',jsonb_build_array('Published milestones','Tracked reliability'),'impact',jsonb_build_array('Trust through consistency'),'videoUrl',NULL,'takeaway','Story must tighten execution.'),'profileWeights',jsonb_build_object('speedVsDepth',0.1,'shortVsLong',0.2,'riskVsConviction',0.3),'citationQueryHint',format('lennys podcast %s strategy narrative execution trust', theme_label))
          )
        ),
        jsonb_build_object(
          'prompt', format('Round 5 - Operating principle: For the next month on "%s", which principle do you defend publicly?', theme_label),
          'choices', jsonb_build_array(
            jsonb_build_object('id','a','label','One bottleneck, one owner, one weekly review','feedback',jsonb_build_object('layer1','You chose disciplined focus.','layer2','Risk: lower flexibility.','layer3','Cadence plus ownership is a repeat operator pattern.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Clear ownership rhythm compounds execution quality.','whatTheyDid',jsonb_build_array('Named bottleneck','Assigned owner'),'impact',jsonb_build_array('Compounding execution'),'videoUrl',NULL,'takeaway','Rhythm can be a moat.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.1,'shortVsLong',-0.2,'riskVsConviction',0.0),'citationQueryHint',format('lennys podcast %s weekly cadence ownership', theme_label)),
            jsonb_build_object('id','b','label','Max experiment throughput with hard stop rules','feedback',jsonb_build_object('layer1','You optimized for learning velocity.','layer2','Risk: context switching.','layer3','High tempo works with ruthless pruning.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','The best teams run many tests and kill weak bets early.','whatTheyDid',jsonb_build_array('Ran small tests','Killed losers fast'),'impact',jsonb_build_array('Faster discovery'),'videoUrl',NULL,'takeaway','Experimentation needs subtraction.'),'profileWeights',jsonb_build_object('speedVsDepth',0.25,'shortVsLong',0.15,'riskVsConviction',0.2),'citationQueryHint',format('lennys podcast %s experimentation stop rules', theme_label)),
            jsonb_build_object('id','c','label','Protect attention by cutting low-leverage work','feedback',jsonb_build_object('layer1','You treated attention as scarce capital.','layer2','Risk: short-term friction.','layer3','Leverage often comes from saying no.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Saying no is often the highest-leverage operator move.','whatTheyDid',jsonb_build_array('Removed low ROI work','Reallocated focus'),'impact',jsonb_build_array('Higher leverage outcomes'),'videoUrl',NULL,'takeaway','Focus is executable strategy.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.2,'shortVsLong',-0.1,'riskVsConviction',0.1),'citationQueryHint',format('lennys podcast %s saying no focus leverage', theme_label))
          )
        )
      );

      INSERT INTO public.simulation_definitions (
        podcast_id, slug, track, title, teaser, cover_emoji, rounds, estimated_minutes, published, display_order
      ) VALUES (
        pid, sim_slug, t, sim_title, sim_teaser,
        CASE t WHEN 'product' THEN '🧩' WHEN 'growth' THEN '📈' WHEN 'strategy' THEN '🧭' WHEN 'leadership' THEN '🧠' ELSE '⚖️' END,
        rounds, 8, true,
        200 + CASE t WHEN 'product' THEN 0 WHEN 'growth' THEN 100 WHEN 'strategy' THEN 200 WHEN 'leadership' THEN 300 ELSE 400 END + i
      )
      ON CONFLICT (podcast_id, slug) DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'refresh_simulator_50plus_content_v2: completed';
END $$;

