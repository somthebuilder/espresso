-- Expand the 3 trial simulations from 1 round to 5 rounds each.
-- Safe to re-run.

DO $$
DECLARE
  pid uuid;
BEGIN
  SELECT id INTO pid
  FROM public.podcasts
  WHERE slug = 'lennys-podcast'
  LIMIT 1;

  IF pid IS NULL THEN
    RAISE NOTICE 'expand_three_trial_simulations_to_five_rounds: podcast not found; skipping';
    RETURN;
  END IF;

  UPDATE public.simulation_definitions
  SET rounds = $json$[
    {
      "prompt": "You're a PM at a SaaS company. Activation dropped from 42% to 26% in two weeks after a redesign. Growth says it's onboarding friction. Design says it's a messaging issue. Engineering says nothing changed. You have 48 hours before the exec review. What do you do first?",
      "choices": [
        {
          "id": "a",
          "label": "Jump into funnel analytics and identify drop-off points",
          "feedback": {
            "layer1": "You move fast to quantify the problem.",
            "layer2": "You may optimize what’s measurable, not what’s meaningful.",
            "layer3": "Repeatedly, you risk becoming data-dependent without context."
          },
          "layer4_static": {
            "headline": "How real operators approached this",
            "operatorLine": "Strong operators pair metrics with direct user understanding early.",
            "whatTheyDid": ["Analyzed funnel to find breakpoints", "Paired data with user session reviews", "Validated assumptions with interviews"],
            "impact": ["Faster identification of real issues", "Avoided optimizing the wrong step"],
            "videoUrl": null,
            "takeaway": "Data shows where. Users tell you why."
          },
          "profileWeights": {"speedVsDepth": 0.6, "shortVsLong": 0.2, "riskVsConviction": 0.3},
          "citationQueryHint": "activation drop onboarding funnel analysis user interviews product decisions"
        },
        {
          "id": "b",
          "label": "Talk to 5–7 recent users who dropped off",
          "feedback": {
            "layer1": "You prioritize understanding over speed.",
            "layer2": "You risk delaying immediate action.",
            "layer3": "Over time, you build strong product intuition."
          },
          "layer4_static": {
            "headline": "How real operators approached this",
            "operatorLine": "Many operators default to talking to users before reacting to metrics.",
            "whatTheyDid": ["Reached out to recent drop-offs", "Conducted quick user interviews", "Mapped qualitative friction points"],
            "impact": ["Identified root causes early", "Avoided surface-level fixes"],
            "videoUrl": null,
            "takeaway": "Understanding beats reacting."
          },
          "profileWeights": {"speedVsDepth": -0.4, "shortVsLong": -0.6, "riskVsConviction": 0.2},
          "citationQueryHint": "user interviews product decisions activation drop qualitative insights PM approach"
        },
        {
          "id": "c",
          "label": "Revert the redesign immediately",
          "feedback": {
            "layer1": "You reduce immediate risk.",
            "layer2": "You lose the chance to learn from failure.",
            "layer3": "Repeatedly, you may default to safety over progress."
          },
          "layer4_static": {
            "headline": "How real operators approached this",
            "operatorLine": "Some teams revert quickly to stabilize, then investigate.",
            "whatTheyDid": ["Rolled back risky changes", "Stabilized metrics", "Ran controlled experiments afterward"],
            "impact": ["Protected short-term performance", "Delayed deeper understanding"],
            "videoUrl": null,
            "takeaway": "Stability buys time, not insight."
          },
          "profileWeights": {"speedVsDepth": 0.5, "shortVsLong": 0.7, "riskVsConviction": -0.6},
          "citationQueryHint": "product rollback decision activation drop revert vs investigate tradeoff"
        }
      ]
    },
    {
      "prompt": "The CEO asks for a visible recovery plan in 10 days, but your team wants two full sprints to fix onboarding architecture. Which path do you choose?",
      "choices": [
        {
          "id": "a",
          "label": "Ship a visible quick-win patch and promise deeper fixes next cycle",
          "feedback": {"layer1": "You optimize for stakeholder confidence now.", "layer2": "You risk creating patchwork debt.", "layer3": "Repeatedly, this can turn into optics-first execution."},
          "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Teams sometimes buy time with visible wins, but document debt explicitly.", "whatTheyDid": ["Shipped fast patch", "Set debt repayment date", "Tracked side effects"], "impact": ["Restored confidence", "Debt management burden"], "videoUrl": null, "takeaway": "Quick wins need debt discipline."},
          "profileWeights": {"speedVsDepth": 0.4, "shortVsLong": 0.35, "riskVsConviction": 0.1},
          "citationQueryHint": "quick wins vs technical debt product recovery plan"
        },
        {
          "id": "b",
          "label": "Protect architecture work and communicate a slower but durable recovery",
          "feedback": {"layer1": "You optimize for long-term correction.", "layer2": "You accept short-term narrative pressure.", "layer3": "Repeatedly, this builds trust if outcomes follow."},
          "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Durable teams often absorb short-term pain for structural fixes.", "whatTheyDid": ["Set realistic timeline", "Published risk register", "Reported weekly"], "impact": ["Stronger system health", "Initial external pressure"], "videoUrl": null, "takeaway": "Durability needs clear communication."},
          "profileWeights": {"speedVsDepth": -0.45, "shortVsLong": -0.5, "riskVsConviction": -0.1},
          "citationQueryHint": "durable fix vs short term optics product leadership"
        },
        {
          "id": "c",
          "label": "Split capacity 50/50 between patching and architecture",
          "feedback": {"layer1": "You try to balance narrative and fundamentals.", "layer2": "You risk doing both poorly.", "layer3": "Repeatedly, split focus can blur accountability."},
          "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Balanced plans work only with hard ownership boundaries.", "whatTheyDid": ["Separate workstreams", "Named owners", "Set kill criteria"], "impact": ["Some flexibility", "Coordination overhead"], "videoUrl": null, "takeaway": "Balance without clear ownership becomes drift."},
          "profileWeights": {"speedVsDepth": 0.1, "shortVsLong": 0.05, "riskVsConviction": 0.15},
          "citationQueryHint": "split focus product roadmap tradeoff"
        }
      ]
    },
    {
      "prompt": "You discover activation decline is concentrated in one segment: self-serve SMB users. Enterprise onboarding is stable. What’s your next move?",
      "choices": [
        {"id": "a", "label": "Focus all fixes on SMB path and defer enterprise roadmap asks", "feedback": {"layer1": "You align effort to highest pain segment.", "layer2": "Enterprise stakeholders may push back.", "layer3": "Repeatedly, segment focus sharpens leverage."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Segmented strategy often beats one-size-fits-all responses.", "whatTheyDid": ["Segmented funnel ownership", "Prioritized segment fixes"], "impact": ["Higher leverage fixes"], "videoUrl": null, "takeaway": "Segment first, then prioritize."}, "profileWeights": {"speedVsDepth": -0.1, "shortVsLong": -0.2, "riskVsConviction": 0.1}, "citationQueryHint": "segment specific activation strategy smb self serve"},
        {"id": "b", "label": "Apply one global onboarding simplification for all user types", "feedback": {"layer1": "You simplify execution and messaging.", "layer2": "You may dilute segment-specific needs.", "layer3": "Repeatedly, global fixes can hide local problems."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Global simplification works best when user jobs-to-be-done are similar.", "whatTheyDid": ["Validated common pain", "Ran cross-segment tests"], "impact": ["Operational simplicity"], "videoUrl": null, "takeaway": "Simplicity helps when differences are minor."}, "profileWeights": {"speedVsDepth": 0.2, "shortVsLong": 0.1, "riskVsConviction": -0.05}, "citationQueryHint": "global onboarding simplification tradeoff"},
        {"id": "c", "label": "Stand up a temporary SMB task force with growth, product, design, and support", "feedback": {"layer1": "You create cross-functional urgency.", "layer2": "Task forces can become noisy without scope discipline.", "layer3": "Repeatedly, this works when roles are explicit."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Task forces are effective when tightly scoped and time-boxed.", "whatTheyDid": ["Set 2-week mandate", "Defined success metric"], "impact": ["Fast aligned execution"], "videoUrl": null, "takeaway": "Cross-functional effort needs a clear clock."}, "profileWeights": {"speedVsDepth": 0.25, "shortVsLong": 0.05, "riskVsConviction": 0.2}, "citationQueryHint": "cross functional task force activation recovery"}
      ]
    },
    {
      "prompt": "Your fix ideas are ready, but instrumentation has known gaps from the redesign rollout. Do you ship now or fix measurement first?",
      "choices": [
        {"id": "a", "label": "Ship now with provisional metrics and monitor directional changes", "feedback": {"layer1": "You prioritize momentum despite imperfect data.", "layer2": "You risk false positives/negatives.", "layer3": "Repeatedly, this can normalize weak measurement habits."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Some teams ship under uncertainty but predefine rollback triggers.", "whatTheyDid": ["Defined guardrails", "Set rollback thresholds"], "impact": ["Faster learning loop"], "videoUrl": null, "takeaway": "Speed under uncertainty requires safeguards."}, "profileWeights": {"speedVsDepth": 0.45, "shortVsLong": 0.25, "riskVsConviction": 0.25}, "citationQueryHint": "shipping with imperfect data rollback thresholds"},
        {"id": "b", "label": "Pause feature fixes for 3 days and repair key tracking events first", "feedback": {"layer1": "You protect decision quality.", "layer2": "You absorb short-term pressure.", "layer3": "Repeatedly, this builds healthier learning systems."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Strong operators treat instrumentation as product infrastructure.", "whatTheyDid": ["Audited event schema", "Validated dashboards"], "impact": ["Higher confidence decisions"], "videoUrl": null, "takeaway": "Bad measurement makes good teams slow."}, "profileWeights": {"speedVsDepth": -0.35, "shortVsLong": -0.25, "riskVsConviction": -0.1}, "citationQueryHint": "instrumentation first before product changes"},
        {"id": "c", "label": "Ship minimal low-risk fix while data team patches instrumentation in parallel", "feedback": {"layer1": "You hedge between velocity and reliability.", "layer2": "Parallel work can create coordination drag.", "layer3": "Repeatedly, this works when scope is tightly bounded."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Parallel lanes can work with explicit lane ownership.", "whatTheyDid": ["Bounded release scope", "Clear lane owners"], "impact": ["Some speed with reduced blind spots"], "videoUrl": null, "takeaway": "Parallel execution needs strict boundaries."}, "profileWeights": {"speedVsDepth": 0.1, "shortVsLong": 0.0, "riskVsConviction": 0.1}, "citationQueryHint": "parallel shipping and instrumentation coordination"}
      ]
    },
    {
      "prompt": "Final round: You can commit one activation KPI for the next 30 days. Which one do you own publicly?",
      "choices": [
        {"id": "a", "label": "Time-to-first-value (TTFV)", "feedback": {"layer1": "You focus on early user value delivery.", "layer2": "May miss later onboarding failures.", "layer3": "Repeatedly, this sharpens product onboarding design."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Teams often pick TTFV when early friction is the core problem.", "whatTheyDid": ["Mapped first-value moments", "Cut setup friction"], "impact": ["Higher early conversion"], "videoUrl": null, "takeaway": "Early value clarity compounds activation."}, "profileWeights": {"speedVsDepth": -0.15, "shortVsLong": -0.1, "riskVsConviction": 0.0}, "citationQueryHint": "time to first value activation metric"},
        {"id": "b", "label": "Activation completion rate", "feedback": {"layer1": "You select a direct and visible KPI.", "layer2": "Can be gamed without value depth.", "layer3": "Repeatedly, this drives execution focus but needs guardrails."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Simple conversion metrics work best with quality counter-metrics.", "whatTheyDid": ["Tracked completion + retention", "Audited quality"], "impact": ["Clear progress signal"], "videoUrl": null, "takeaway": "Simple metrics need anti-gaming checks."}, "profileWeights": {"speedVsDepth": 0.2, "shortVsLong": 0.1, "riskVsConviction": 0.1}, "citationQueryHint": "activation completion metric quality guardrails"},
        {"id": "c", "label": "D30 retained activation cohort", "feedback": {"layer1": "You optimize for durable value realization.", "layer2": "Feedback loop is slower.", "layer3": "Repeatedly, this aligns product and growth long-term."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Retention-backed activation reveals whether first value was real.", "whatTheyDid": ["Linked activation to retention", "Tracked cohort health"], "impact": ["Stronger PMF signal"], "videoUrl": null, "takeaway": "Durability beats vanity lifts."}, "profileWeights": {"speedVsDepth": -0.3, "shortVsLong": -0.35, "riskVsConviction": -0.05}, "citationQueryHint": "activation retention cohort d30 durability"}
      ]
    }
  ]$json$::jsonb,
  updated_at = NOW()
  WHERE podcast_id = pid AND slug = 'activation-drop-conflict';

  UPDATE public.simulation_definitions
  SET rounds = $json$[
    {
      "prompt": "Your primary acquisition channel (paid ads) suddenly becomes unprofitable due to rising costs. CAC doubled in 2 weeks. The board still expects growth this quarter. What’s your first move?",
      "choices": [
        {
          "id": "a",
          "label": "Double down on optimizing the existing channel",
          "feedback": {"layer1": "You try to recover what worked before.", "layer2": "You risk diminishing returns.", "layer3": "Over time, you may overfit to a dying strategy."},
          "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Operators often test if the channel is fixable before abandoning it.", "whatTheyDid": ["Ran optimization experiments", "Improved targeting and creatives", "Tested new bidding strategies"], "impact": ["Sometimes recovered performance", "Often confirmed channel decay"], "videoUrl": null, "takeaway": "Fix before you abandon—but know when to stop."},
          "profileWeights": {"speedVsDepth": 0.3, "shortVsLong": 0.4, "riskVsConviction": -0.2},
          "citationQueryHint": "paid acquisition optimization CAC increase growth decision channel decay"
        },
        {
          "id": "b",
          "label": "Shift focus to retention and lifecycle improvements",
          "feedback": {"layer1": "You strengthen existing user value.", "layer2": "Growth may slow in the short term.", "layer3": "You build compounding growth foundations."},
          "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Strong growth leaders pivot to retention when acquisition weakens.", "whatTheyDid": ["Improved onboarding flows", "Increased engagement loops", "Optimized lifecycle messaging"], "impact": ["Higher LTV", "Reduced dependency on paid channels"], "videoUrl": null, "takeaway": "Retention is growth you already paid for."},
          "profileWeights": {"speedVsDepth": -0.2, "shortVsLong": -0.7, "riskVsConviction": 0.4},
          "citationQueryHint": "retention vs acquisition growth strategy lifecycle optimization LTV focus"
        },
        {
          "id": "c",
          "label": "Explore new acquisition channels aggressively",
          "feedback": {"layer1": "You chase new opportunities quickly.", "layer2": "You risk spreading resources thin.", "layer3": "Over time, you may find breakout channels—or burn budget."},
          "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Operators often test multiple channels in parallel during disruption.", "whatTheyDid": ["Experimented with new platforms", "Tested organic and referral loops", "Allocated small test budgets"], "impact": ["Occasional breakout wins", "Many failed experiments"], "videoUrl": null, "takeaway": "Exploration creates optionality."},
          "profileWeights": {"speedVsDepth": 0.7, "shortVsLong": 0.1, "riskVsConviction": 0.8},
          "citationQueryHint": "growth channel exploration experimentation acquisition diversification strategy"
        }
      ]
    },
    {
      "prompt": "Finance asks for a recovery plan by Friday: cut spend by 30% or prove a path back to efficient growth in 3 weeks. What do you pick?",
      "choices": [
        {"id": "a", "label": "Immediate spend cuts + protect only top-performing campaigns", "feedback": {"layer1": "You protect cash and reduce downside quickly.", "layer2": "You may lose learning surface area.", "layer3": "Repeatedly, this builds discipline but can undercut experimentation."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Strong teams cut aggressively, then rebuild with cleaner unit economics.", "whatTheyDid": ["Cut worst cohorts", "Protected high-intent channels"], "impact": ["Lower burn", "Short-term top-line pressure"], "videoUrl": null, "takeaway": "Cash discipline buys strategic time."}, "profileWeights": {"speedVsDepth": 0.25, "shortVsLong": 0.2, "riskVsConviction": -0.15}, "citationQueryHint": "growth spend cuts unit economics under pressure"},
        {"id": "b", "label": "Keep spend steady but redesign funnel for conversion efficiency", "feedback": {"layer1": "You attack efficiency before volume contraction.", "layer2": "If conversion gains miss, downside worsens.", "layer3": "Repeatedly, this can produce durable CAC improvements."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Some growth leaders stabilize top-funnel while repairing mid-funnel leaks.", "whatTheyDid": ["Fixed landing page-message fit", "Improved onboarding"], "impact": ["Potential CAC recovery"], "videoUrl": null, "takeaway": "Efficiency work can outpace blunt cuts."}, "profileWeights": {"speedVsDepth": -0.05, "shortVsLong": -0.2, "riskVsConviction": 0.2}, "citationQueryHint": "conversion efficiency before spend cuts growth"},
        {"id": "c", "label": "Present a staged plan: modest cuts now, milestone-based reinvestment later", "feedback": {"layer1": "You create a reversible plan with governance.", "layer2": "Execution complexity increases.", "layer3": "Repeatedly, staged plans improve trust if milestones are clear."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Milestone-based capital deployment is common in volatile channels.", "whatTheyDid": ["Defined reinvestment gates", "Published weekly scorecard"], "impact": ["Balanced risk and upside"], "videoUrl": null, "takeaway": "Governed optionality beats binary bets."}, "profileWeights": {"speedVsDepth": 0.05, "shortVsLong": -0.05, "riskVsConviction": 0.15}, "citationQueryHint": "staged growth investment milestone based planning"}
      ]
    },
    {
      "prompt": "Your team found one organic channel with promise, but it will take 6-8 weeks to scale. Board wants visible growth now. How do you balance this?",
      "choices": [
        {"id": "a", "label": "Prioritize short-term paid recovery and treat organic as secondary", "feedback": {"layer1": "You optimize for immediate board optics.", "layer2": "You may remain dependent on fragile paid economics.", "layer3": "Repeatedly, this can delay strategic channel diversification."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Operators sometimes defend the quarter first, then diversify.", "whatTheyDid": ["Stabilized paid first", "Deferred scaling organic"], "impact": ["Near-term predictability"], "videoUrl": null, "takeaway": "Defending the quarter can cost future resilience."}, "profileWeights": {"speedVsDepth": 0.35, "shortVsLong": 0.3, "riskVsConviction": -0.1}, "citationQueryHint": "paid stabilization vs organic diversification"},
        {"id": "b", "label": "Reallocate meaningful budget into organic despite delayed payoff", "feedback": {"layer1": "You prioritize structural channel resilience.", "layer2": "You accept slower visible growth this quarter.", "layer3": "Repeatedly, this can create a healthier growth mix."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Compounding channels often require uncomfortable early patience.", "whatTheyDid": ["Shifted budget", "Defined organic leading indicators"], "impact": ["Reduced paid dependence"], "videoUrl": null, "takeaway": "Resilient growth often looks slow at first."}, "profileWeights": {"speedVsDepth": -0.25, "shortVsLong": -0.4, "riskVsConviction": 0.35}, "citationQueryHint": "investing in compounding organic channels under pressure"},
        {"id": "c", "label": "Run a dual-track plan with explicit resource caps and weekly kill rules", "feedback": {"layer1": "You hedge with controlled exploration.", "layer2": "Coordination overhead rises.", "layer3": "Repeatedly, this works when kill criteria are actually enforced."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Dual-track strategies succeed with strict operating discipline.", "whatTheyDid": ["Capped budgets", "Enforced kill/reinvest gates"], "impact": ["Maintained optionality"], "videoUrl": null, "takeaway": "Optionality needs hard operating rules."}, "profileWeights": {"speedVsDepth": 0.1, "shortVsLong": 0.0, "riskVsConviction": 0.25}, "citationQueryHint": "dual track growth strategy kill rules optionality"}
      ]
    },
    {
      "prompt": "Product argues growth experiments are hurting onboarding quality. Growth argues product velocity is too slow. You get one alignment decision this week.",
      "choices": [
        {"id": "a", "label": "Create one shared north-star + guardrail set across both teams", "feedback": {"layer1": "You force a common operating reality.", "layer2": "Local team nuances may get compressed.", "layer3": "Repeatedly, this reduces cross-functional blame cycles."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Shared metrics contracts are a repeat pattern in strong product-growth partnerships.", "whatTheyDid": ["Defined shared north-star", "Added guardrails"], "impact": ["Faster conflict resolution"], "videoUrl": null, "takeaway": "Shared metrics reduce politics."}, "profileWeights": {"speedVsDepth": 0.15, "shortVsLong": 0.05, "riskVsConviction": 0.1}, "citationQueryHint": "product growth shared metrics contract"},
        {"id": "b", "label": "Prioritize product quality for one cycle, then resume growth tempo", "feedback": {"layer1": "You de-risk long-term experience quality.", "layer2": "You accept short-term growth softness.", "layer3": "Repeatedly, this can restore trust in the core loop."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Great growth orgs pause acceleration when core experience cracks.", "whatTheyDid": ["Stabilized core UX", "Resumed growth after"], "impact": ["Lower churn risk"], "videoUrl": null, "takeaway": "Growth on weak product foundations is fragile."}, "profileWeights": {"speedVsDepth": -0.2, "shortVsLong": -0.25, "riskVsConviction": 0.0}, "citationQueryHint": "pause growth to fix product quality"},
        {"id": "c", "label": "Keep growth tempo and assign a tiger team to quality issues", "feedback": {"layer1": "You protect growth momentum while addressing quality in parallel.", "layer2": "Parallel paths can mask ownership ambiguity.", "layer3": "Repeatedly, this works only with strict decision ownership."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Parallel execution can work when accountability is explicit.", "whatTheyDid": ["Tiger team with mandate", "Weekly owner review"], "impact": ["Maintained speed with controlled risk"], "videoUrl": null, "takeaway": "Parallel work needs clear owners."}, "profileWeights": {"speedVsDepth": 0.25, "shortVsLong": 0.2, "riskVsConviction": 0.2}, "citationQueryHint": "parallel growth and quality tiger team"}
      ]
    },
    {
      "prompt": "Final round: You choose one operating principle for next quarter. Which growth principle do you commit to?",
      "choices": [
        {"id": "a", "label": "Unit economics before volume", "feedback": {"layer1": "You prioritize efficiency discipline.", "layer2": "Top-line growth may look slower.", "layer3": "Repeatedly, this creates healthier scaling."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Operators who scale efficiently survive channel shocks better.", "whatTheyDid": ["Set CAC/LTV gates", "Cut low-quality spend"], "impact": ["Higher growth quality"], "videoUrl": null, "takeaway": "Quality growth compounds."}, "profileWeights": {"speedVsDepth": -0.1, "shortVsLong": -0.2, "riskVsConviction": -0.05}, "citationQueryHint": "unit economics before volume growth principle"},
        {"id": "b", "label": "Relentless experimentation with strict kill criteria", "feedback": {"layer1": "You optimize for discovery velocity.", "layer2": "Execution overhead rises without discipline.", "layer3": "Repeatedly, this can uncover outsized channels."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "High-tempo growth teams win by killing weak experiments fast.", "whatTheyDid": ["Increased experiment cadence", "Enforced stop-rules"], "impact": ["Faster learning loops"], "videoUrl": null, "takeaway": "Experimentation needs subtraction."}, "profileWeights": {"speedVsDepth": 0.3, "shortVsLong": 0.1, "riskVsConviction": 0.35}, "citationQueryHint": "growth experimentation cadence kill criteria"},
        {"id": "c", "label": "Retention-led growth over acquisition-led growth", "feedback": {"layer1": "You choose compounding from existing users.", "layer2": "Acquisition narrative may soften short-term.", "layer3": "Repeatedly, this lowers dependence on paid volatility."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Retention-centric operators often build more resilient growth systems.", "whatTheyDid": ["Improved activation-retention loop", "Reduced paid dependence"], "impact": ["Higher LTV stability"], "videoUrl": null, "takeaway": "Retention is durable growth leverage."}, "profileWeights": {"speedVsDepth": -0.2, "shortVsLong": -0.35, "riskVsConviction": 0.2}, "citationQueryHint": "retention led growth principle ltv resilience"}
      ]
    }
  ]$json$::jsonb,
  updated_at = NOW()
  WHERE podcast_id = pid AND slug = 'channel-collapse-pressure';

  UPDATE public.simulation_definitions
  SET rounds = $json$[
    {
      "prompt": "You're hiring a senior PM. One candidate has strong execution experience but weak strategic thinking. Another is highly strategic but lacks execution depth. The team is split. You must decide this week. What do you do?",
      "choices": [
        {
          "id": "a",
          "label": "Hire the execution-focused candidate",
          "feedback": {"layer1": "You prioritize immediate output.", "layer2": "You may limit long-term strategic growth.", "layer3": "You build teams optimized for delivery, not direction."},
          "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Teams often hire for immediate gaps under pressure.", "whatTheyDid": ["Focused on execution capability", "Filled urgent delivery needs", "Deferred strategic hiring"], "impact": ["Faster short-term progress", "Strategic gaps persisted"], "videoUrl": null, "takeaway": "Hiring for today shapes tomorrow."},
          "profileWeights": {"speedVsDepth": 0.6, "shortVsLong": 0.5, "riskVsConviction": -0.3},
          "citationQueryHint": "hiring decision execution vs strategy PM hiring tradeoffs team building"
        },
        {
          "id": "b",
          "label": "Hire the strategic thinker",
          "feedback": {"layer1": "You invest in long-term direction.", "layer2": "Execution may slow initially.", "layer3": "You build future leadership capacity."},
          "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Some leaders hire for potential over immediate output.", "whatTheyDid": ["Prioritized strategic thinking", "Paired with strong execution teams", "Invested in onboarding support"], "impact": ["Stronger long-term decisions", "Slower early execution"], "videoUrl": null, "takeaway": "Direction compounds more than speed."},
          "profileWeights": {"speedVsDepth": -0.5, "shortVsLong": -0.7, "riskVsConviction": 0.6},
          "citationQueryHint": "hiring for potential vs execution leadership decision strategy hiring tradeoff"
        },
        {
          "id": "c",
          "label": "Delay hiring and keep searching",
          "feedback": {"layer1": "You avoid compromise.", "layer2": "You risk slowing team progress.", "layer3": "You may build higher-quality teams—or miss opportunities."},
          "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Some leaders maintain a high bar even under pressure.", "whatTheyDid": ["Extended hiring timeline", "Refined candidate criteria", "Explored broader talent pools"], "impact": ["Higher quality hires", "Short-term execution delays"], "videoUrl": null, "takeaway": "Bar over speed—if you can afford it."},
          "profileWeights": {"speedVsDepth": -0.3, "shortVsLong": -0.4, "riskVsConviction": 0.2},
          "citationQueryHint": "hiring bar vs urgency leadership decision delay hire tradeoff"
        }
      ]
    },
    {
      "prompt": "After final interviews, your top candidate asks for comp above band and broader scope. Finance pushes back. What’s your move?",
      "choices": [
        {"id": "a", "label": "Hold the band and reinforce role growth path", "feedback": {"layer1": "You protect compensation integrity.", "layer2": "You may lose the candidate.", "layer3": "Repeatedly, this preserves internal fairness systems."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Experienced leaders protect comp systems unless role scope truly changes.", "whatTheyDid": ["Held comp principles", "Clarified growth trajectory"], "impact": ["Stronger internal trust"], "videoUrl": null, "takeaway": "Comp consistency is a culture signal."}, "profileWeights": {"speedVsDepth": -0.1, "shortVsLong": -0.2, "riskVsConviction": 0.0}, "citationQueryHint": "compensation band discipline hiring"},
        {"id": "b", "label": "Stretch comp selectively with explicit performance milestones", "feedback": {"layer1": "You optimize for close probability while limiting precedent risk.", "layer2": "Complex offers can create expectation ambiguity.", "layer3": "Repeatedly, this works with transparent logic."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Selective flexibility can work when tied to explicit scope and milestones.", "whatTheyDid": ["Scoped stretch conditions", "Documented milestones"], "impact": ["Balanced close and fairness"], "videoUrl": null, "takeaway": "Flexibility needs structure."}, "profileWeights": {"speedVsDepth": 0.1, "shortVsLong": 0.0, "riskVsConviction": 0.15}, "citationQueryHint": "structured offer flexibility milestones hiring"},
        {"id": "c", "label": "Walk away and reopen search", "feedback": {"layer1": "You protect principle and avoid rushed compromise.", "layer2": "Critical seat remains open longer.", "layer3": "Repeatedly, this can strengthen bar discipline if pipeline is healthy."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Strong teams sometimes walk to preserve long-run compensation health.", "whatTheyDid": ["Maintained bar", "Restarted targeted sourcing"], "impact": ["Lower precedent risk", "Higher short-term vacancy cost"], "videoUrl": null, "takeaway": "Walking away is sometimes the highest-leverage choice."}, "profileWeights": {"speedVsDepth": -0.15, "shortVsLong": -0.1, "riskVsConviction": 0.1}, "citationQueryHint": "walk away hiring offer decision"}
      ]
    },
    {
      "prompt": "The team challenges your decision: half believe you over-indexed on strategy; half think execution gaps will hurt delivery. What do you do next?",
      "choices": [
        {"id": "a", "label": "Publish explicit decision rationale + expected failure modes", "feedback": {"layer1": "You build transparency and learning alignment.", "layer2": "You invite scrutiny that can slow momentum.", "layer3": "Repeatedly, this improves decision trust over time."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Transparent hiring rationales reduce retrospective politics.", "whatTheyDid": ["Shared rationale memo", "Named risks and mitigations"], "impact": ["Higher trust in leadership decisions"], "videoUrl": null, "takeaway": "Transparency compounds team trust."}, "profileWeights": {"speedVsDepth": -0.05, "shortVsLong": -0.1, "riskVsConviction": 0.05}, "citationQueryHint": "transparent hiring rationale leadership trust"},
        {"id": "b", "label": "Move forward quietly and let outcomes validate the choice", "feedback": {"layer1": "You keep execution moving without debate drag.", "layer2": "Unresolved skepticism may linger.", "layer3": "Repeatedly, this can weaken decision literacy in the org."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Some leaders avoid over-explaining, but pay trust tax later.", "whatTheyDid": ["Kept execution focus", "Limited discussion"], "impact": ["Short-term speed", "Potential trust friction"], "videoUrl": null, "takeaway": "Silence is fast but expensive."}, "profileWeights": {"speedVsDepth": 0.2, "shortVsLong": 0.1, "riskVsConviction": 0.15}, "citationQueryHint": "leadership decision communication tradeoff"},
        {"id": "c", "label": "Run a post-hire calibration session with interview panel", "feedback": {"layer1": "You convert disagreement into process learning.", "layer2": "Takes extra time from delivery.", "layer3": "Repeatedly, this strengthens future hiring quality."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Top teams institutionalize panel calibration after contentious hires.", "whatTheyDid": ["Debriefed panel signal quality", "Updated rubrics"], "impact": ["Better future hiring loops"], "videoUrl": null, "takeaway": "Conflict can be converted into system improvement."}, "profileWeights": {"speedVsDepth": -0.2, "shortVsLong": -0.15, "riskVsConviction": 0.0}, "citationQueryHint": "post hire calibration interview panel"}
      ]
    },
    {
      "prompt": "Two weeks in, the new hire is strong on one dimension but struggling on the other (as predicted). What intervention do you make first?",
      "choices": [
        {"id": "a", "label": "Pair them with a complementary peer for weekly decision reviews", "feedback": {"layer1": "You address the gap with leverage from team strengths.", "layer2": "Can increase coordination overhead.", "layer3": "Repeatedly, this builds cross-functional leadership depth."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Complementary pairing is a common way to accelerate new-hire ramp.", "whatTheyDid": ["Set pairing cadence", "Focused on real decisions"], "impact": ["Faster capability transfer"], "videoUrl": null, "takeaway": "Targeted pairing accelerates ramp."}, "profileWeights": {"speedVsDepth": -0.1, "shortVsLong": -0.15, "riskVsConviction": 0.05}, "citationQueryHint": "new hire ramp complementary pairing"},
        {"id": "b", "label": "Narrow scope to their strengths until confidence builds", "feedback": {"layer1": "You optimize near-term output quality.", "layer2": "Skill gap may persist longer.", "layer3": "Repeatedly, this can create role-shape drift."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Scope narrowing can stabilize output but must be temporary.", "whatTheyDid": ["Scoped to strengths", "Set expansion checkpoints"], "impact": ["Immediate execution reliability"], "videoUrl": null, "takeaway": "Temporary scope guardrails can buy runway."}, "profileWeights": {"speedVsDepth": 0.15, "shortVsLong": 0.1, "riskVsConviction": -0.05}, "citationQueryHint": "new hire scope narrowing temporary"},
        {"id": "c", "label": "Reset expectations explicitly with a 30-day development plan", "feedback": {"layer1": "You create direct clarity and accountability.", "layer2": "Hard conversations can feel uncomfortable early.", "layer3": "Repeatedly, this builds a high-trust performance culture."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Early expectation resets prevent silent performance drift.", "whatTheyDid": ["Set 30-day goals", "Scheduled progress check-ins"], "impact": ["Clear performance trajectory"], "videoUrl": null, "takeaway": "Early clarity prevents later surprises."}, "profileWeights": {"speedVsDepth": -0.05, "shortVsLong": -0.1, "riskVsConviction": 0.1}, "citationQueryHint": "early expectation reset new hire performance"}
      ]
    },
    {
      "prompt": "Final round: You can codify one hiring principle for all future senior PM hires. Which principle do you publish?",
      "choices": [
        {"id": "a", "label": "Hire for immediate execution gap under business pressure", "feedback": {"layer1": "You align hiring with near-term business needs.", "layer2": "May underinvest in future leadership capacity.", "layer3": "Repeatedly, org becomes delivery-heavy but direction-light."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Pressure-driven hiring can work but creates long-run composition effects.", "whatTheyDid": ["Optimized near-term staffing"], "impact": ["Fast delivery"], "videoUrl": null, "takeaway": "Today’s hiring heuristic shapes tomorrow’s org."}, "profileWeights": {"speedVsDepth": 0.25, "shortVsLong": 0.2, "riskVsConviction": -0.1}, "citationQueryHint": "hire for immediate execution under pressure"},
        {"id": "b", "label": "Hire for long-term slope and build support around gaps", "feedback": {"layer1": "You optimize for compounding leadership potential.", "layer2": "Short-term output variability may increase.", "layer3": "Repeatedly, this can strengthen strategic bench depth."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "Slope-based hiring is common in high-learning cultures.", "whatTheyDid": ["Selected for growth trajectory", "Added ramp scaffolding"], "impact": ["Stronger future leadership"], "videoUrl": null, "takeaway": "Potential compounds when supported intentionally."}, "profileWeights": {"speedVsDepth": -0.2, "shortVsLong": -0.35, "riskVsConviction": 0.25}, "citationQueryHint": "hire for slope long term leadership bench"},
        {"id": "c", "label": "No-hire unless both execution and strategy bars are clearly met", "feedback": {"layer1": "You protect hiring bar consistency.", "layer2": "Open roles may remain unfilled longer.", "layer3": "Repeatedly, this can improve quality but stress existing team load."}, "layer4_static": {"headline": "How real operators approached this", "operatorLine": "No-hire discipline can be powerful when pipeline health supports it.", "whatTheyDid": ["Maintained strict bar", "Invested in sourcing quality"], "impact": ["Higher quality hires", "Longer time-to-fill"], "videoUrl": null, "takeaway": "Bar discipline has operational costs."}, "profileWeights": {"speedVsDepth": -0.15, "shortVsLong": -0.2, "riskVsConviction": 0.05}, "citationQueryHint": "no hire discipline senior pm bar"}
      ]
    }
  ]$json$::jsonb,
  updated_at = NOW()
  WHERE podcast_id = pid AND slug = 'hiring-signal-conflict';

  RAISE NOTICE 'expand_three_trial_simulations_to_five_rounds: completed';
END $$;

