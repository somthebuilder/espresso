-- Make Round 1 intros and choices theme-specific + story-driven.
-- Keeps rounds 2-5 untouched for now.

DO $$
DECLARE
  rec record;
  theme_label text;
  backstory text;
  prompt text;
  c1 text;
  c2 text;
  c3 text;
  new_round jsonb;
BEGIN
  FOR rec IN
    SELECT id, track, title, rounds
    FROM public.simulation_definitions
    WHERE slug ~ '^[a-z0-9-]+-[0-9]{2}$'
      AND track IN ('product', 'growth', 'strategy', 'leadership', 'mixed')
      AND jsonb_typeof(rounds) = 'array'
      AND jsonb_array_length(rounds) >= 1
  LOOP
    theme_label := trim(split_part(rec.title, ':', 2));

    IF rec.track = 'product' THEN
      backstory := format(
        'Monday morning: your %s metric moved hard after last week''s release. Support tickets spiked, sales is escalating churn risk, and leadership wants a call by EOD.',
        theme_label
      );
      prompt := format(
        '%s\n\nRound 1 - Situation scan:\nBefore making a roadmap commitment on "%s", what is your first operator move?',
        backstory, theme_label
      );
      c1 := format('Pull 12 user sessions tied to "%s" and map the top 3 friction points today', theme_label);
      c2 := format('Ship a rapid guardrail change to stabilize "%s" while deeper fixes are scoped', theme_label);
      c3 := format('Freeze adjacent work and run a 72-hour "%s" decision sprint with eng/design/data', theme_label);

    ELSIF rec.track = 'growth' THEN
      backstory := format(
        'Your main growth loop for %s just softened: CAC is up, conversion is down, and finance cut next month''s paid budget by 25%%.',
        theme_label
      );
      prompt := format(
        '%s\n\nRound 1 - First call:\nWhat do you do first to prevent a bad quarter while keeping learning velocity high on "%s"?',
        backstory, theme_label
      );
      c1 := format('Re-segment the "%s" funnel by cohort quality and pause lowest-intent spend today', theme_label);
      c2 := format('Launch two fast lifecycle experiments to recover "%s" conversion this week', theme_label);
      c3 := format('Shift budget from paid into creator/referral motion until "%s" unit economics recover', theme_label);

    ELSIF rec.track = 'strategy' THEN
      backstory := format(
        'At the quarterly offsite, your team is split on %s: one camp wants to double down, another wants to re-position before competitors lock the category.',
        theme_label
      );
      prompt := format(
        '%s\n\nRound 1 - Strategic framing:\nWhat is your first move to reduce regret risk before committing to a multi-quarter bet on "%s"?',
        backstory, theme_label
      );
      c1 := format('Write a one-page "%s" thesis with explicit kill criteria and review gates', theme_label);
      c2 := format('Run a focused customer narrative sprint to validate "%s" positioning assumptions', theme_label);
      c3 := format('Place a bounded option bet on "%s" while protecting the core business plan', theme_label);

    ELSIF rec.track = 'leadership' THEN
      IF lower(theme_label) = 'hiring' THEN
        backstory := 'Your most important seat is open, interview feedback is inconsistent, and the team is already feeling the execution gap.';
        prompt := format(
          '%s\n\nRound 1 - Hiring brief:\nBefore interviewing the next candidate slate, which decision framework do you lock for "%s"?',
          backstory, theme_label
        );
        c1 := 'Define 90-day outcomes + scorecard and calibrate every interviewer to it';
        c2 := 'Prioritize high-slope operators and accept broader role ambiguity for speed';
        c3 := 'Delay close decisions until org design and manager bandwidth are finalized';
      ELSE
        backstory := format(
          'A leadership fault line is opening around %s: execution is slowing, trust is noisy, and your next move will set the tone for the quarter.',
          theme_label
        );
        prompt := format(
          '%s\n\nRound 1 - Leadership stance:\nWhat is your first move to stabilize outcomes and trust around "%s"?',
          backstory, theme_label
        );
        c1 := format('Set a clear decision owner and operating cadence for "%s" this week', theme_label);
        c2 := format('Run a short alignment reset to surface hidden assumptions in "%s"', theme_label);
        c3 := format('Protect team capacity by cutting low-leverage work linked to "%s"', theme_label);
      END IF;

    ELSE
      backstory := format(
        'You are in a cross-functional pressure test on %s: product, growth, and ops each have a different answer, and everyone expects immediate progress.',
        theme_label
      );
      prompt := format(
        '%s\n\nRound 1 - Cross-functional call:\nWhat is your first operator move to create clarity and momentum on "%s"?',
        backstory, theme_label
      );
      c1 := format('Create a single "%s" decision memo with owner, metric, and 14-day checkpoint', theme_label);
      c2 := format('Run parallel micro-tests on "%s" with explicit stop-rules and one shared dashboard', theme_label);
      c3 := format('Cut one conflicting team priority so "%s" gets protected focus immediately', theme_label);
    END IF;

    new_round := jsonb_build_object(
      'prompt', prompt,
      'choices', jsonb_build_array(
        jsonb_build_object(
          'id', 'a',
          'label', c1,
          'feedback', jsonb_build_object(
            'layer1', 'You created a structured first move with clear intent.',
            'layer2', 'Trade-off: this can feel slower if stakeholders expect instant visible change.',
            'layer3', 'If repeated: this style compounds decision quality when paired with tight review loops.'
          ),
          'layer4_static', jsonb_build_object(
            'headline', 'How real operators approached this',
            'operatorLine', 'Guests on the show repeatedly describe explicit operating assumptions as a force multiplier.',
            'whatTheyDid', jsonb_build_array('Named decision owner', 'Set evidence threshold', 'Reviewed on cadence'),
            'impact', jsonb_build_array('Cleaner alignment', 'Lower rework risk'),
            'videoUrl', NULL,
            'takeaway', 'Clarity early usually saves cycles later.'
          ),
          'profileWeights', jsonb_build_object('speedVsDepth', -0.05, 'shortVsLong', -0.1, 'riskVsConviction', 0.0),
          'citationQueryHint', format('lennys podcast %s operator assumptions decision framework', theme_label)
        ),
        jsonb_build_object(
          'id', 'b',
          'label', c2,
          'feedback', jsonb_build_object(
            'layer1', 'You optimized for momentum and fast signal.',
            'layer2', 'Trade-off: speed can anchor the team before the full context is visible.',
            'layer3', 'If repeated: this style wins when guardrails and stop-rules are explicit.'
          ),
          'layer4_static', jsonb_build_object(
            'headline', 'How real operators approached this',
            'operatorLine', 'High-tempo operators move quickly, but make reversibility explicit.',
            'whatTheyDid', jsonb_build_array('Time-boxed experiments', 'Predefined stop-rules', 'Tracked counter-metrics'),
            'impact', jsonb_build_array('Faster learning', 'Lower downside'),
            'videoUrl', NULL,
            'takeaway', 'Speed is strongest when exits are planned upfront.'
          ),
          'profileWeights', jsonb_build_object('speedVsDepth', 0.2, 'shortVsLong', 0.15, 'riskVsConviction', 0.2),
          'citationQueryHint', format('lennys podcast %s fast iteration with guardrails', theme_label)
        ),
        jsonb_build_object(
          'id', 'c',
          'label', c3,
          'feedback', jsonb_build_object(
            'layer1', 'You protected focus by narrowing competing priorities.',
            'layer2', 'Trade-off: this can create short-term friction with adjacent teams.',
            'layer3', 'If repeated: this style compounds leverage when communicated with clear rationale.'
          ),
          'layer4_static', jsonb_build_object(
            'headline', 'How real operators approached this',
            'operatorLine', 'Many guests frame strategic progress as the art of saying no to preserve focus.',
            'whatTheyDid', jsonb_build_array('Cut low-leverage work', 'Aligned stakeholders', 'Protected core objective'),
            'impact', jsonb_build_array('Higher leverage execution', 'Less thrash'),
            'videoUrl', NULL,
            'takeaway', 'Focus is an operating decision, not a slogan.'
          ),
          'profileWeights', jsonb_build_object('speedVsDepth', 0.05, 'shortVsLong', 0.1, 'riskVsConviction', 0.15),
          'citationQueryHint', format('lennys podcast %s saying no for focus and leverage', theme_label)
        )
      )
    );

    UPDATE public.simulation_definitions
    SET rounds = jsonb_set(rec.rounds, '{0}', new_round, true),
        updated_at = NOW()
    WHERE id = rec.id;
  END LOOP;

  RAISE NOTICE 'refresh_simulator_round1_backstories_v1: completed';
END $$;

