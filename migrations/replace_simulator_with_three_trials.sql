-- Replace current simulator definitions for lennys-podcast
-- with 3 trial scenarios provided by the user.

DO $$
DECLARE
  pid uuid;
BEGIN
  SELECT id INTO pid
  FROM public.podcasts
  WHERE slug = 'lennys-podcast'
  LIMIT 1;

  IF pid IS NULL THEN
    RAISE NOTICE 'replace_simulator_with_three_trials: podcast not found; skipping';
    RETURN;
  END IF;

  DELETE FROM public.simulation_definitions
  WHERE podcast_id = pid;

  INSERT INTO public.simulation_definitions (
    podcast_id, slug, track, title, teaser, cover_emoji, rounds, estimated_minutes, published, display_order
  )
  VALUES
    (
      pid,
      'activation-drop-conflict',
      'product',
      'Product: The Activation Cliff',
      'Activation drops fast, but every team sees a different problem.',
      '📉',
      $json$[
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
        }
      ]$json$::jsonb,
      6,
      true,
      1
    ),
    (
      pid,
      'channel-collapse-pressure',
      'growth',
      'Growth: When the Channel Dies',
      'Your best acquisition channel stops working overnight.',
      '🚫',
      $json$[
        {
          "prompt": "Your primary acquisition channel (paid ads) suddenly becomes unprofitable due to rising costs. CAC doubled in 2 weeks. The board still expects growth this quarter. What’s your first move?",
          "choices": [
            {
              "id": "a",
              "label": "Double down on optimizing the existing channel",
              "feedback": {
                "layer1": "You try to recover what worked before.",
                "layer2": "You risk diminishing returns.",
                "layer3": "Over time, you may overfit to a dying strategy."
              },
              "layer4_static": {
                "headline": "How real operators approached this",
                "operatorLine": "Operators often test if the channel is fixable before abandoning it.",
                "whatTheyDid": ["Ran optimization experiments", "Improved targeting and creatives", "Tested new bidding strategies"],
                "impact": ["Sometimes recovered performance", "Often confirmed channel decay"],
                "videoUrl": null,
                "takeaway": "Fix before you abandon—but know when to stop."
              },
              "profileWeights": {"speedVsDepth": 0.3, "shortVsLong": 0.4, "riskVsConviction": -0.2},
              "citationQueryHint": "paid acquisition optimization CAC increase growth decision channel decay"
            },
            {
              "id": "b",
              "label": "Shift focus to retention and lifecycle improvements",
              "feedback": {
                "layer1": "You strengthen existing user value.",
                "layer2": "Growth may slow in the short term.",
                "layer3": "You build compounding growth foundations."
              },
              "layer4_static": {
                "headline": "How real operators approached this",
                "operatorLine": "Strong growth leaders pivot to retention when acquisition weakens.",
                "whatTheyDid": ["Improved onboarding flows", "Increased engagement loops", "Optimized lifecycle messaging"],
                "impact": ["Higher LTV", "Reduced dependency on paid channels"],
                "videoUrl": null,
                "takeaway": "Retention is growth you already paid for."
              },
              "profileWeights": {"speedVsDepth": -0.2, "shortVsLong": -0.7, "riskVsConviction": 0.4},
              "citationQueryHint": "retention vs acquisition growth strategy lifecycle optimization LTV focus"
            },
            {
              "id": "c",
              "label": "Explore new acquisition channels aggressively",
              "feedback": {
                "layer1": "You chase new opportunities quickly.",
                "layer2": "You risk spreading resources thin.",
                "layer3": "Over time, you may find breakout channels—or burn budget."
              },
              "layer4_static": {
                "headline": "How real operators approached this",
                "operatorLine": "Operators often test multiple channels in parallel during disruption.",
                "whatTheyDid": ["Experimented with new platforms", "Tested organic and referral loops", "Allocated small test budgets"],
                "impact": ["Occasional breakout wins", "Many failed experiments"],
                "videoUrl": null,
                "takeaway": "Exploration creates optionality."
              },
              "profileWeights": {"speedVsDepth": 0.7, "shortVsLong": 0.1, "riskVsConviction": 0.8},
              "citationQueryHint": "growth channel exploration experimentation acquisition diversification strategy"
            }
          ]
        }
      ]$json$::jsonb,
      6,
      true,
      2
    ),
    (
      pid,
      'hiring-signal-conflict',
      'leadership',
      'Leadership: The Hiring Split',
      'Strong candidates, conflicting signals, and a critical hire.',
      '👥',
      $json$[
        {
          "prompt": "You're hiring a senior PM. One candidate has strong execution experience but weak strategic thinking. Another is highly strategic but lacks execution depth. The team is split. You must decide this week. What do you do?",
          "choices": [
            {
              "id": "a",
              "label": "Hire the execution-focused candidate",
              "feedback": {
                "layer1": "You prioritize immediate output.",
                "layer2": "You may limit long-term strategic growth.",
                "layer3": "You build teams optimized for delivery, not direction."
              },
              "layer4_static": {
                "headline": "How real operators approached this",
                "operatorLine": "Teams often hire for immediate gaps under pressure.",
                "whatTheyDid": ["Focused on execution capability", "Filled urgent delivery needs", "Deferred strategic hiring"],
                "impact": ["Faster short-term progress", "Strategic gaps persisted"],
                "videoUrl": null,
                "takeaway": "Hiring for today shapes tomorrow."
              },
              "profileWeights": {"speedVsDepth": 0.6, "shortVsLong": 0.5, "riskVsConviction": -0.3},
              "citationQueryHint": "hiring decision execution vs strategy PM hiring tradeoffs team building"
            },
            {
              "id": "b",
              "label": "Hire the strategic thinker",
              "feedback": {
                "layer1": "You invest in long-term direction.",
                "layer2": "Execution may slow initially.",
                "layer3": "You build future leadership capacity."
              },
              "layer4_static": {
                "headline": "How real operators approached this",
                "operatorLine": "Some leaders hire for potential over immediate output.",
                "whatTheyDid": ["Prioritized strategic thinking", "Paired with strong execution teams", "Invested in onboarding support"],
                "impact": ["Stronger long-term decisions", "Slower early execution"],
                "videoUrl": null,
                "takeaway": "Direction compounds more than speed."
              },
              "profileWeights": {"speedVsDepth": -0.5, "shortVsLong": -0.7, "riskVsConviction": 0.6},
              "citationQueryHint": "hiring for potential vs execution leadership decision strategy hiring tradeoff"
            },
            {
              "id": "c",
              "label": "Delay hiring and keep searching",
              "feedback": {
                "layer1": "You avoid compromise.",
                "layer2": "You risk slowing team progress.",
                "layer3": "You may build higher-quality teams—or miss opportunities."
              },
              "layer4_static": {
                "headline": "How real operators approached this",
                "operatorLine": "Some leaders maintain a high bar even under pressure.",
                "whatTheyDid": ["Extended hiring timeline", "Refined candidate criteria", "Explored broader talent pools"],
                "impact": ["Higher quality hires", "Short-term execution delays"],
                "videoUrl": null,
                "takeaway": "Bar over speed—if you can afford it."
              },
              "profileWeights": {"speedVsDepth": -0.3, "shortVsLong": -0.4, "riskVsConviction": 0.2},
              "citationQueryHint": "hiring bar vs urgency leadership decision delay hire tradeoff"
            }
          ]
        }
      ]$json$::jsonb,
      6,
      true,
      3
    );

  RAISE NOTICE 'replace_simulator_with_three_trials: completed';
END $$;

