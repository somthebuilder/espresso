# Operator Simulator — interview grounding & citations

## Target: ≥80% drawn from the show

“Drawn from interviews” is enforced in two ways:

1. **Editorial / authoring**  
   Each scenario’s prompts, choices, and “operator lens” copy should be written **from themes and stories that actually appear on Lenny’s Podcast** — synthesis of activation, growth, GTM, etc., not generic blog advice.  
   When authoring in `simulation_definitions.rounds` (JSON), prefer:
   - Situations guests **explicitly discussed** (metrics drops, roadmap fights, PLG vs sales).
   - **Optional** `citationQueryHint` on a choice (string) to steer embedding search toward the right guest/theme vocabulary.

2. **Runtime evidence**  
   After each choice, the app calls **`POST /api/simulator/citations`**, which:
   - Builds a query from: simulation title, round prompt, choice label, tradeoff line, takeaway, and optional `citationQueryHint`.
   - Embeds with **Gemini `text-embedding-004` at 1536 dims** (or **OpenAI** fallback), same as chat.
   - Runs Supabase **`match_chunks`** over **interview + lightning_round** segments only.
   - Surfaces **up to 3** chunks with guest name, episode title, similarity, and YouTube deep link.

This does **not** replace editorial judgment: it **grounds** each beat in real transcript evidence when the corpus and embeddings are healthy.

## “High confidence” citation

A chunk is labeled **Strong match** when similarity ≥ **`HIGH_CONFIDENCE_SIMILARITY`** (see `frontend/lib/simulator/citation-search.ts`, default **0.55** cosine-style score from `1 - distance`).  
The API returns `hasHighConfidence` if **at least one** returned chunk clears that bar.

Tune thresholds after sampling your index:
- Too few hits → lower `MIN_CITATION_SIMILARITY` slightly or improve `citationQueryHint` in seed data.
- Noisy hits → raise `HIGH_CONFIDENCE_SIMILARITY` or tighten hints.

## Theme graph

Citations are **embedding neighbors** of the scenario text; related **themes** appear on the **Theme Graph** (`/[podcast-slug]/graph`). The UI links there so users can explore **where else** similar discussions cluster — it is not a second retrieval pass (yet).

## Required env (citations)

- **`GEMINI_API_KEY`** or **`GOOGLE_API_KEY`** (embeddings; same as chat), or  
- **`OPENAI_API_KEY`** as fallback for `text-embedding-3-small`.

- **`SUPABASE_SERVICE_ROLE_KEY`** — required for `match_chunks` + `guests` / `episodes` joins (same as simulator runs).

## Future: automated extraction

A possible pipeline (not implemented here):

1. Sample high-weight **theme–episode** edges from `knowledge_graph_cache`.
2. Pull top chunks per theme; cluster or summarize.
3. LLM drafts **5-round** scenario with **mandatory** quote IDs or chunk IDs.
4. Human review; store in `simulation_definitions` with `citationQueryHint` per choice.
