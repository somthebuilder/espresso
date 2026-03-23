-- Regenerate generated simulator bank with track-specific decision semantics.
-- Focus: remove generic "diagnosis/root-cause" language for non-product themes.
-- Safe to re-run.

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

  product_themes text[] := ARRAY['Activation','Onboarding','Pricing','Retention','Roadmap','User Research','Product-Market Fit','Segmentation','Funnel Friction','Quality'];
  growth_themes text[] := ARRAY['Acquisition','Distribution','Referrals','SEO','Monetization','Lifecycle','Paid Channels','Content Loops','Conversion','Virality'];
  strategy_themes text[] := ARRAY['Market Timing','Positioning','Competitive Moats','Focus','Expansion','Category Design','Portfolio Bets','Resource Allocation','Optionality','Risk'];
  leadership_themes text[] := ARRAY['Hiring','Decision Velocity','Team Alignment','Ownership','Feedback Culture','Conflict Resolution','Manager Leverage','Org Design','Trust','Accountability'];
  mixed_themes text[] := ARRAY['Execution under uncertainty','Founder-operator mindset','High-stakes communication','Shipping discipline','Cross-functional alignment','Tradeoff quality','Compounding decisions','Learning velocity','Resilience','Strategic clarity'];
BEGIN
  SELECT id INTO pid FROM public.podcasts WHERE slug = 'lennys-podcast' LIMIT 1;
  IF pid IS NULL THEN
    RAISE NOTICE 'refresh_simulator_50plus_content_v3_track_specific: podcast not found; skipping';
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

      sim_teaser := format(
        CASE t
          WHEN 'product' THEN 'You own product outcomes in %s. Five decisions, no obvious right answer.'
          WHEN 'growth' THEN 'You own growth outcomes in %s. Five decisions, no obvious right answer.'
          WHEN 'strategy' THEN 'You are making multi-quarter bets in %s. Five decisions, no obvious right answer.'
          WHEN 'leadership' THEN 'You are leading people decisions in %s. Five decisions, no obvious right answer.'
          ELSE 'You are in a cross-functional challenge around %s. Five decisions, no obvious right answer.'
        END,
        theme_label
      );

      IF t = 'leadership' THEN
        rounds := jsonb_build_array(
          jsonb_build_object(
            'prompt', format('Round 1 - Role framing: A critical %s seat opened this week. Which hiring brief do you lock before sourcing?', theme_label),
            'choices', jsonb_build_array(
              jsonb_build_object('id','a','label','Write outcomes for the first 90 days and score candidates against execution evidence','feedback',jsonb_build_object('layer1','You defined success in operational terms.','layer2','Risk: may underweight long-term upside.','layer3','Strong leaders turn hiring into a measurable operating decision.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Top guests repeatedly describe role scorecards tied to concrete outcomes.','whatTheyDid',jsonb_build_array('Defined 90-day outcomes','Aligned interview loops'),'impact',jsonb_build_array('Cleaner calibration'),'videoUrl',NULL,'takeaway','Great hiring starts with a clear mandate.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.1,'shortVsLong',-0.2,'riskVsConviction',0.0),'citationQueryHint',format('lennys podcast hiring role scorecard first 90 days %s', theme_label)),
              jsonb_build_object('id','b','label','Prioritize high-agency generalists who can stretch as the role evolves','feedback',jsonb_build_object('layer1','You optimized for adaptability under ambiguity.','layer2','Risk: blurred ownership in the first months.','layer3','Best operators pair flexibility with explicit success boundaries.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Leaders often hire slope when the problem space is still moving.','whatTheyDid',jsonb_build_array('Hired for slope','Set clear guardrails'),'impact',jsonb_build_array('Faster adaptation'),'videoUrl',NULL,'takeaway','Potential works best with clear constraints.'),'profileWeights',jsonb_build_object('speedVsDepth',0.1,'shortVsLong',0.05,'riskVsConviction',0.2),'citationQueryHint',format('lennys podcast hire for slope high agency ambiguity %s', theme_label)),
              jsonb_build_object('id','c','label','Escalate req approval and postpone until org design is finalized','feedback',jsonb_build_object('layer1','You reduced coordination risk before hiring.','layer2','Risk: prolonged vacancy cost.','layer3','Great leaders delay only when design uncertainty is truly material.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Experienced operators delay headcount when reporting lines are still unstable.','whatTheyDid',jsonb_build_array('Clarified org shape','Then hired decisively'),'impact',jsonb_build_array('Lower reorg churn'),'videoUrl',NULL,'takeaway','Wait only when uncertainty is structural.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.2,'shortVsLong',0.15,'riskVsConviction',-0.1),'citationQueryHint',format('lennys podcast delay hiring until org design clear %s', theme_label))
            )
          ),
          jsonb_build_object(
            'prompt', format('Round 2 - Pipeline strategy: You have 20 candidates and limited interview bandwidth for %s. How do you narrow?', theme_label),
            'choices', jsonb_build_array(
              jsonb_build_object('id','a','label','Run a structured work-sample early and cut on demonstrated judgment','feedback',jsonb_build_object('layer1','You optimized for signal quality early.','layer2','Risk: candidate drop-off from heavier upfront work.','layer3','Top operators front-load signal on the highest-risk competency.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Work-sample loops frequently appear in high-quality hiring systems.','whatTheyDid',jsonb_build_array('Designed practical exercise','Calibrated rubrics'),'impact',jsonb_build_array('Higher predictive signal'),'videoUrl',NULL,'takeaway','Evidence beats polish.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.15,'shortVsLong',-0.1,'riskVsConviction',0.05),'citationQueryHint',format('lennys podcast work sample hiring signal quality %s', theme_label)),
              jsonb_build_object('id','b','label','Push fast founder/executive screen to preserve speed and close quickly','feedback',jsonb_build_object('layer1','You optimized for velocity and conviction.','layer2','Risk: higher false-positive risk without structured checks.','layer3','Fast loops win when standards are explicit and repeatable.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Rapid close strategies work best with clear non-negotiables.','whatTheyDid',jsonb_build_array('Defined must-haves','Moved quickly on yes-cases'),'impact',jsonb_build_array('Lower time-to-fill'),'videoUrl',NULL,'takeaway','Speed is a moat when quality bars are explicit.'),'profileWeights',jsonb_build_object('speedVsDepth',0.25,'shortVsLong',0.2,'riskVsConviction',0.2),'citationQueryHint',format('lennys podcast fast hiring close while keeping bar high %s', theme_label)),
              jsonb_build_object('id','c','label','Use referral-heavy sourcing and pause inbound for this cycle','feedback',jsonb_build_object('layer1','You optimized for trusted signal sources.','layer2','Risk: reduced diversity of candidate profiles.','layer3','Strong leaders counterbalance referrals with deliberate sourcing breadth.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Referral channels are strong but require diversity guardrails.','whatTheyDid',jsonb_build_array('Tracked funnel mix','Expanded sourcing deliberately'),'impact',jsonb_build_array('Balanced quality + breadth'),'videoUrl',NULL,'takeaway','Trusted channels need diversity safeguards.'),'profileWeights',jsonb_build_object('speedVsDepth',0.05,'shortVsLong',0.1,'riskVsConviction',0.1),'citationQueryHint',format('lennys podcast referrals hiring diversity sourcing balance %s', theme_label))
            )
          ),
          jsonb_build_object(
            'prompt', format('Round 3 - Calibration conflict: Interviewers disagree sharply on a final candidate for %s. What do you do?', theme_label),
            'choices', jsonb_build_array(
              jsonb_build_object('id','a','label','Re-open one targeted panel to resolve the highest-risk competency','feedback',jsonb_build_object('layer1','You resolved disagreement with focused evidence.','layer2','Risk: slower close and candidate fatigue.','layer3','Best operators narrow the dispute, not restart the entire process.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','High-signal teams run targeted follow-ups instead of full loop resets.','whatTheyDid',jsonb_build_array('Isolated disagreement','Ran focused follow-up'),'impact',jsonb_build_array('Cleaner decisions'),'videoUrl',NULL,'takeaway','Resolve disagreement with specific evidence.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.1,'shortVsLong',-0.05,'riskVsConviction',0.0),'citationQueryHint',format('lennys podcast interview calibration conflict focused followup %s', theme_label)),
              jsonb_build_object('id','b','label','Trust hiring manager conviction and move to offer now','feedback',jsonb_build_object('layer1','You backed clear ownership in decision-making.','layer2','Risk: over-indexing on one evaluator viewpoint.','layer3','Strong operators pair owner conviction with explicit dissent capture.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Clear decision owners reduce drift, but dissent should be documented.','whatTheyDid',jsonb_build_array('Named decision owner','Captured dissent notes'),'impact',jsonb_build_array('Faster decision velocity'),'videoUrl',NULL,'takeaway','Owner-based decisions still need transparent dissent.'),'profileWeights',jsonb_build_object('speedVsDepth',0.2,'shortVsLong',0.1,'riskVsConviction',0.25),'citationQueryHint',format('lennys podcast decision owner hiring dissent capture %s', theme_label)),
              jsonb_build_object('id','c','label','No-hire and continue search until interviewer confidence converges','feedback',jsonb_build_object('layer1','You protected bar consistency under uncertainty.','layer2','Risk: prolonged vacancy and team load.','layer3','Great operators use no-hire strategically, not by default.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','No-hire decisions can be right when role risk is asymmetric.','whatTheyDid',jsonb_build_array('Chose no-hire','Improved sourcing thesis'),'impact',jsonb_build_array('Avoided costly mismatches'),'videoUrl',NULL,'takeaway','No-hire is a decision, not a delay.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.25,'shortVsLong',-0.15,'riskVsConviction',-0.1),'citationQueryHint',format('lennys podcast no-hire decision maintaining hiring bar %s', theme_label))
            )
          ),
          jsonb_build_object(
            'prompt', format('Round 4 - Offer design: Top candidate for %s has a competing offer and asks for scope + comp stretch. Your move?', theme_label),
            'choices', jsonb_build_array(
              jsonb_build_object('id','a','label','Match selectively: flex scope, hold comp band with performance kicker','feedback',jsonb_build_object('layer1','You balanced close probability with pay equity discipline.','layer2','Risk: complexity in expectation management.','layer3','Top leaders treat offer design as long-term org signal.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Offer decisions are precedent-setting culture decisions.','whatTheyDid',jsonb_build_array('Protected comp integrity','Used scoped upside'),'impact',jsonb_build_array('Balanced fairness + close'),'videoUrl',NULL,'takeaway','Close offers without breaking compensation logic.'),'profileWeights',jsonb_build_object('speedVsDepth',0.05,'shortVsLong',-0.05,'riskVsConviction',0.1),'citationQueryHint',format('lennys podcast hiring offer design comp bands scope tradeoff %s', theme_label)),
              jsonb_build_object('id','b','label','Hold the original package and reinforce mission + growth path','feedback',jsonb_build_object('layer1','You protected internal consistency and values signal.','layer2','Risk: losing candidate in tight market.','layer3','Great operators know when to walk to protect long-run fairness.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Mission-led closes work when growth path is concrete, not generic.','whatTheyDid',jsonb_build_array('Clarified trajectory','Held compensation principles'),'impact',jsonb_build_array('Stronger long-term trust'),'videoUrl',NULL,'takeaway','Consistency compounds credibility.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.1,'shortVsLong',-0.2,'riskVsConviction',0.0),'citationQueryHint',format('lennys podcast hold comp line mission growth path hiring %s', theme_label)),
              jsonb_build_object('id','c','label','Overpay to close immediately and de-risk vacancy cost','feedback',jsonb_build_object('layer1','You optimized for immediate fill under pressure.','layer2','Risk: internal compression and precedent distortion.','layer3','Strong operators only do this with explicit correction plans.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Emergency close tactics need downstream compensation cleanup plans.','whatTheyDid',jsonb_build_array('Closed critical seat fast','Planned equity corrections'),'impact',jsonb_build_array('Protected near-term execution'),'videoUrl',NULL,'takeaway','Short-term closes create long-term obligations.'),'profileWeights',jsonb_build_object('speedVsDepth',0.25,'shortVsLong',0.25,'riskVsConviction',0.3),'citationQueryHint',format('lennys podcast overpay to close hiring compensation compression %s', theme_label))
            )
          ),
          jsonb_build_object(
            'prompt', format('Round 5 - First 30 days: Your new hire for %s starts Monday. What onboarding operating principle do you enforce?', theme_label),
            'choices', jsonb_build_array(
              jsonb_build_object('id','a','label','Set weekly outcome milestones with one accountable onboarding owner','feedback',jsonb_build_object('layer1','You prioritized clarity and execution rhythm.','layer2','Risk: lower flexibility if context changes fast.','layer3','Strong operators make onboarding measurable from week one.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Great onboarding systems mirror great operating systems: ownership + cadence.','whatTheyDid',jsonb_build_array('Defined milestones','Assigned owner'),'impact',jsonb_build_array('Faster time-to-impact'),'videoUrl',NULL,'takeaway','Onboarding is an execution system.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.1,'shortVsLong',-0.2,'riskVsConviction',0.0),'citationQueryHint',format('lennys podcast onboarding first 30 days milestones ownership %s', theme_label)),
              jsonb_build_object('id','b','label','Give broad autonomy early and review only at week 4','feedback',jsonb_build_object('layer1','You optimized for ownership and trust.','layer2','Risk: hidden drift before correction.','layer3','Top leaders pair autonomy with lightweight early checkpoints.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Autonomy works best with an explicit definition of done.','whatTheyDid',jsonb_build_array('Granted autonomy','Kept clear success criteria'),'impact',jsonb_build_array('Higher ownership'),'videoUrl',NULL,'takeaway','Autonomy needs early signal checks.'),'profileWeights',jsonb_build_object('speedVsDepth',0.15,'shortVsLong',0.1,'riskVsConviction',0.2),'citationQueryHint',format('lennys podcast early autonomy new hire success criteria %s', theme_label)),
              jsonb_build_object('id','c','label','Prioritize relationship mapping across peers before hard deliverables','feedback',jsonb_build_object('layer1','You invested in collaboration capacity early.','layer2','Risk: slower early output optics.','layer3','Best operators treat network-building as execution leverage.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Cross-functional trust often predicts long-term new-hire success.','whatTheyDid',jsonb_build_array('Mapped key relationships','Sequenced deliverables'),'impact',jsonb_build_array('Smoother execution later'),'videoUrl',NULL,'takeaway','Relationship capital accelerates delivery later.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.15,'shortVsLong',-0.1,'riskVsConviction',0.05),'citationQueryHint',format('lennys podcast new hire relationship mapping cross functional trust %s', theme_label))
            )
          )
        );
      ELSE
        rounds := jsonb_build_array(
          jsonb_build_object(
            'prompt', format('Round 1: You have a high-stakes decision in "%s" and limited time. What is your first move?', theme_label),
            'choices', jsonb_build_array(
              jsonb_build_object('id','a','label','Commit to a fast thesis and run a short test cycle','feedback',jsonb_build_object('layer1','You created momentum quickly.','layer2','Risk: anchoring too early.','layer3','Strong operators keep fast theses reversible.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Leaders often combine speed with explicit assumptions.','whatTheyDid',jsonb_build_array('Named assumptions','Set checkpoints'),'impact',jsonb_build_array('Faster alignment'),'videoUrl',NULL,'takeaway','Speed is strongest when assumptions are explicit.'),'profileWeights',jsonb_build_object('speedVsDepth',0.2,'shortVsLong',0.1,'riskVsConviction',0.15),'citationQueryHint',format('lennys podcast %s quick thesis and test cycle', theme_label)),
              jsonb_build_object('id','b','label','Run a short diagnostic pass before committing resources','feedback',jsonb_build_object('layer1','You prioritized decision quality.','layer2','Risk: slower visible action.','layer3','Short diagnostic passes often avoid expensive rework.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','High-quality teams separate noise from trend quickly.','whatTheyDid',jsonb_build_array('Validated core signals','Then committed'),'impact',jsonb_build_array('Cleaner execution'),'videoUrl',NULL,'takeaway','Small delays can increase total velocity.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.2,'shortVsLong',-0.1,'riskVsConviction',-0.1),'citationQueryHint',format('lennys podcast %s diagnostic pass before commitment', theme_label)),
              jsonb_build_object('id','c','label','Escalate for top-down direction before acting','feedback',jsonb_build_object('layer1','You optimized for authority clarity.','layer2','Risk: weak local ownership.','layer3','Best operators escalate constraints, not accountability.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Teams move fastest when ownership remains local and explicit.','whatTheyDid',jsonb_build_array('Clarified decision rights','Kept local owner'),'impact',jsonb_build_array('Lower thrash'),'videoUrl',NULL,'takeaway','Escalate context, not responsibility.'),'profileWeights',jsonb_build_object('speedVsDepth',0.1,'shortVsLong',0.2,'riskVsConviction',0.2),'citationQueryHint',format('lennys podcast %s decision ownership escalation', theme_label))
            )
          ),
          jsonb_build_object(
            'prompt', format('Round 2: You can only back one path for "%s" this sprint. Which bet do you fund?', theme_label),
            'choices', jsonb_build_array(
              jsonb_build_object('id','a','label','Near-term lift with immediate measurable impact','feedback',jsonb_build_object('layer1','You optimized for short-run movement.','layer2','Risk: local maxima.','layer3','Short wins need guardrails to avoid regression.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Fast wins are strongest with counter-metrics.','whatTheyDid',jsonb_build_array('Defined guardrails','Reviewed weekly'),'impact',jsonb_build_array('Controlled acceleration'),'videoUrl',NULL,'takeaway','Short-term wins need anti-regret checks.'),'profileWeights',jsonb_build_object('speedVsDepth',0.2,'shortVsLong',0.25,'riskVsConviction',0.1),'citationQueryHint',format('lennys podcast %s short term bet with guardrails', theme_label)),
              jsonb_build_object('id','b','label','Structural investment that compounds over time','feedback',jsonb_build_object('layer1','You prioritized durability.','layer2','Risk: slower optics.','layer3','Compounding systems require protected focus.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Quiet foundational work often drives outsized future gains.','whatTheyDid',jsonb_build_array('Protected roadmap','Aligned long metric'),'impact',jsonb_build_array('Compounding outcomes'),'videoUrl',NULL,'takeaway','Compounding is a strategic choice.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.2,'shortVsLong',-0.25,'riskVsConviction',-0.1),'citationQueryHint',format('lennys podcast %s structural investment compounding', theme_label)),
              jsonb_build_object('id','c','label','Split resources across two options to preserve flexibility','feedback',jsonb_build_object('layer1','You increased option coverage.','layer2','Risk: diluted focus.','layer3','Parallel bets need strict kill criteria.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Portfolio logic works with pre-committed stop rules.','whatTheyDid',jsonb_build_array('Set kill criteria','Time-boxed experiments'),'impact',jsonb_build_array('Faster learning'),'videoUrl',NULL,'takeaway','Optionality needs discipline.'),'profileWeights',jsonb_build_object('speedVsDepth',0.05,'shortVsLong',0.1,'riskVsConviction',0.25),'citationQueryHint',format('lennys podcast %s portfolio bet stop rules', theme_label))
            )
          ),
          jsonb_build_object(
            'prompt', format('Round 3: Stakeholders disagree on success for "%s". How do you reset alignment?', theme_label),
            'choices', jsonb_build_array(
              jsonb_build_object('id','a','label','Define one shared scorecard and review cadence','feedback',jsonb_build_object('layer1','You created shared truth quickly.','layer2','Risk: may underweight local nuance.','layer3','High-performing teams align on one objective reality.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Common scorecards reduce political drag.','whatTheyDid',jsonb_build_array('Aligned definitions','Ritualized check-ins'),'impact',jsonb_build_array('Faster cross-team decisions'),'videoUrl',NULL,'takeaway','Shared definitions are execution infrastructure.'),'profileWeights',jsonb_build_object('speedVsDepth',0.15,'shortVsLong',0.1,'riskVsConviction',0.1),'citationQueryHint',format('lennys podcast %s shared scorecard alignment', theme_label)),
              jsonb_build_object('id','b','label','Run a two-week alignment sprint before target reset','feedback',jsonb_build_object('layer1','You invested in long-term execution quality.','layer2','Risk: short-term frustration.','layer3','Alignment debt is often the hidden bottleneck.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','When assumptions diverge, speed amplifies waste.','whatTheyDid',jsonb_build_array('Mapped assumptions','Resolved incentive conflicts'),'impact',jsonb_build_array('Cleaner execution'),'videoUrl',NULL,'takeaway','Alignment work is core work.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.2,'shortVsLong',-0.1,'riskVsConviction',-0.05),'citationQueryHint',format('lennys podcast %s alignment debt incentives', theme_label)),
              jsonb_build_object('id','c','label','Keep local KPIs and enforce monthly executive governance','feedback',jsonb_build_object('layer1','You preserved autonomy while setting oversight.','layer2','Risk: slower conflict discovery.','layer3','Autonomy scales with clear non-negotiable constraints.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Decentralized execution works when constraints are shared.','whatTheyDid',jsonb_build_array('Set boundaries','Kept local flexibility'),'impact',jsonb_build_array('Balanced ownership'),'videoUrl',NULL,'takeaway','Autonomy needs boundaries.'),'profileWeights',jsonb_build_object('speedVsDepth',0.05,'shortVsLong',0.2,'riskVsConviction',0.2),'citationQueryHint',format('lennys podcast %s autonomy with constraints', theme_label))
            )
          ),
          jsonb_build_object(
            'prompt', format('Round 4: Capacity drops unexpectedly while "%s" commitments stay fixed. What is your operating move?', theme_label),
            'choices', jsonb_build_array(
              jsonb_build_object('id','a','label','Cut scope aggressively and preserve cadence','feedback',jsonb_build_object('layer1','You protected delivery tempo.','layer2','Risk: hidden debt.','layer3','Scope cuts should pair with explicit cleanup windows.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Best teams shrink scope, not standards.','whatTheyDid',jsonb_build_array('Named must-haves','Scheduled debt paydown'),'impact',jsonb_build_array('Maintained momentum'),'videoUrl',NULL,'takeaway','Scope is elastic; standards are not.'),'profileWeights',jsonb_build_object('speedVsDepth',0.25,'shortVsLong',0.2,'riskVsConviction',0.1),'citationQueryHint',format('lennys podcast %s scope cuts quality guardrails', theme_label)),
              jsonb_build_object('id','b','label','Freeze new bets and stabilize critical foundations','feedback',jsonb_build_object('layer1','You prioritized downside risk control.','layer2','Risk: weaker near-term optics.','layer3','Resilience choices often unlock future speed.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Quiet foundational work can be the highest-leverage move.','whatTheyDid',jsonb_build_array('Protected deep work','Reduced systemic risk'),'impact',jsonb_build_array('Lower volatility'),'videoUrl',NULL,'takeaway','Resilience is a growth strategy.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.25,'shortVsLong',-0.2,'riskVsConviction',-0.1),'citationQueryHint',format('lennys podcast %s foundation stabilization under constraints', theme_label)),
              jsonb_build_object('id','c','label','Renegotiate targets with explicit milestone tradeoffs','feedback',jsonb_build_object('layer1','You aligned expectations to new constraints.','layer2','Risk: credibility if milestones slip.','layer3','Target resets work when tied to visible operating changes.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Narrative must be backed by execution mechanics.','whatTheyDid',jsonb_build_array('Published milestone plan','Tracked reliability'),'impact',jsonb_build_array('Improved expectation quality'),'videoUrl',NULL,'takeaway','Communication should tighten execution.'),'profileWeights',jsonb_build_object('speedVsDepth',0.1,'shortVsLong',0.2,'riskVsConviction',0.25),'citationQueryHint',format('lennys podcast %s renegotiate goals with milestones', theme_label))
            )
          ),
          jsonb_build_object(
            'prompt', format('Round 5: You get one operating principle for the next 30 days on "%s". What do you enforce?', theme_label),
            'choices', jsonb_build_array(
              jsonb_build_object('id','a','label','One bottleneck, one owner, one weekly review','feedback',jsonb_build_object('layer1','You selected disciplined focus.','layer2','Risk: lower flexibility.','layer3','Ownership cadence compounds execution quality.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','High-performing systems pair clear ownership with review rhythm.','whatTheyDid',jsonb_build_array('Named bottleneck','Assigned owner'),'impact',jsonb_build_array('Compounding execution'),'videoUrl',NULL,'takeaway','Rhythm can be an operating moat.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.1,'shortVsLong',-0.2,'riskVsConviction',0.0),'citationQueryHint',format('lennys podcast %s weekly cadence ownership', theme_label)),
              jsonb_build_object('id','b','label','Max experiment throughput with hard stop rules','feedback',jsonb_build_object('layer1','You optimized for learning velocity.','layer2','Risk: context switching fatigue.','layer3','High tempo works with ruthless pruning.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Best teams kill weak bets early and visibly.','whatTheyDid',jsonb_build_array('Ran small experiments','Killed losers fast'),'impact',jsonb_build_array('Faster discovery'),'videoUrl',NULL,'takeaway','Experimentation requires subtraction.'),'profileWeights',jsonb_build_object('speedVsDepth',0.25,'shortVsLong',0.15,'riskVsConviction',0.2),'citationQueryHint',format('lennys podcast %s experiment throughput stop rules', theme_label)),
              jsonb_build_object('id','c','label','Protect attention by removing low-leverage work','feedback',jsonb_build_object('layer1','You treated focus as scarce capital.','layer2','Risk: short-term friction with stakeholders.','layer3','Leverage often comes from saying no.'),'layer4_static',jsonb_build_object('headline','How real operators approached this','operatorLine','Saying no is often the highest-leverage decision.','whatTheyDid',jsonb_build_array('Cut low ROI work','Reallocated attention'),'impact',jsonb_build_array('Higher leverage outcomes'),'videoUrl',NULL,'takeaway','Focus is executable strategy.'),'profileWeights',jsonb_build_object('speedVsDepth',-0.2,'shortVsLong',-0.1,'riskVsConviction',0.1),'citationQueryHint',format('lennys podcast %s saying no focus leverage', theme_label))
            )
          )
        );
      END IF;

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

  RAISE NOTICE 'refresh_simulator_50plus_content_v3_track_specific: completed';
END $$;

