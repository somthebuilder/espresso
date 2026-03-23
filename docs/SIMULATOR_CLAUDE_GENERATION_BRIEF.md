# Simulator Content Generation Brief (for Claude)

Use this brief to generate **50+ high-quality operator simulations** for Lenny-style decision training.

## Goal

Generate engaging, realistic simulations that feel like real operator situations from startup/product/growth/leadership contexts, with:

- Strong Round 1 backstory
- Meaningful trade-offs (no obvious right answer)
- Distinct question semantics across themes and rounds
- Archive-friendly citation hints for retrieval

## Hard Requirements

1. Output exactly **50 simulations**:
   - 10 `product`
   - 10 `growth`
   - 10 `strategy`
   - 10 `leadership`
   - 10 `mixed`
2. Each simulation has **5 rounds**.
3. Each round has exactly **3 choices** (`a`, `b`, `c`).
4. Tone: operator-level, practical, specific, not generic.
5. **Do not reuse templates** across themes. Keep semantic overlap under 10%.
6. Round 1 must include a short but vivid backstory.
7. Every choice must include all feedback layers and operator lens fields.
8. Include `citationQueryHint` for each choice to help embedding retrieval.

## Output Format

Return valid JSON array where each item follows this structure:

```json
{
  "track": "product|growth|strategy|leadership|mixed",
  "slug": "kebab-case-unique",
  "title": "Track Label: Theme",
  "teaser": "1-2 sentence teaser",
  "cover_emoji": "single emoji",
  "estimated_minutes": 8,
  "published": true,
  "display_order": 0,
  "rounds": [
    {
      "prompt": "Round text",
      "choices": [
        {
          "id": "a",
          "label": "choice text",
          "feedback": {
            "layer1": "Immediate impact...",
            "layer2": "Trade-off...",
            "layer3": "If repeated..."
          },
          "layer4_static": {
            "headline": "How real operators approached this",
            "operatorLine": "Concrete operator behavior",
            "whatTheyDid": ["bullet 1", "bullet 2", "bullet 3"],
            "impact": ["impact 1", "impact 2"],
            "videoUrl": null,
            "takeaway": "One-line takeaway"
          },
          "profileWeights": {
            "speedVsDepth": 0.0,
            "shortVsLong": 0.0,
            "riskVsConviction": 0.0
          },
          "citationQueryHint": "retrieval hint text"
        }
      ]
    }
  ]
}
```

## Theme Buckets

### Product (10)
Activation, Onboarding, Pricing, Retention, Roadmap, User Research, PMF, Segmentation, Funnel Friction, Quality

### Growth (10)
Acquisition, Distribution, Referrals, SEO, Monetization, Lifecycle, Paid Channels, Content Loops, Conversion, Virality

### Strategy (10)
Market Timing, Positioning, Competitive Moats, Focus, Expansion, Category Design, Portfolio Bets, Resource Allocation, Optionality, Risk

### Leadership (10)
Hiring, Decision Velocity, Team Alignment, Ownership, Feedback Culture, Conflict Resolution, Manager Leverage, Org Design, Trust, Accountability

### Mixed (10)
Execution Under Uncertainty, Founder-Operator Mindset, High-Stakes Communication, Shipping Discipline, Cross-Functional Alignment, Tradeoff Quality, Compounding Decisions, Learning Velocity, Resilience, Strategic Clarity

## Round Design Guidance

Use this as inspiration, not a rigid template:

- Round 1: Context + backstory + first framing move
- Round 2: Resource/priority bet
- Round 3: Stakeholder conflict or calibration disagreement
- Round 4: Constraint shock (time, headcount, budget, market)
- Round 5: Final operating principle / commitment

For leadership/hiring specifically, avoid product-style wording like "dashboard", "funnel", or "root cause" unless truly relevant.

## Quality Bar

- No generic openers repeated across many sims.
- Backstory must feel plausible and specific.
- Choices must be meaningfully different (not rephrased duplicates).
- Feedback should teach operator reasoning, not moralize.
- `citationQueryHint` should be concrete enough for embedding search.

## Real-World Grounding

Anchor to realistic startup/operator situations inspired by podcast-style discussions:

- Product rollouts with unintended effects
- Growth loops weakening under budget pressure
- Strategy splits at offsites/board reviews
- Hiring loops with conflicting interviewer signal
- Cross-functional tensions between speed, quality, and trust

Do **not** invent fake quotes or fake guest names inside simulation content.

## Final Instruction

Generate all 50 simulations now in one valid JSON payload, following the schema exactly.

