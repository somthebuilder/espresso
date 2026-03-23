/**
 * Query embeddings for vector search — must match chunk_embeddings (1536-dim),
 * OpenAI-only path for simulator retrieval.
 */

const OPENAI_EMBED_MODEL = 'text-embedding-3-small'

async function embedWithOpenAI(apiKey: string, text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: OPENAI_EMBED_MODEL, input: [text] }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI embedding failed: ${res.status} ${err}`)
  }
  const data = await res.json()
  const embedding = data?.data?.[0]?.embedding as number[] | undefined
  if (!embedding?.length) throw new Error('OpenAI embedding response missing values')
  return embedding
}

/** Embed text for pgvector match_chunks (1536 dimensions). */
export async function embedForRetrievalQuery(text: string): Promise<number[]> {
  const openAiKey = process.env.OPENAI_API_KEY?.trim()
  if (openAiKey) return await embedWithOpenAI(openAiKey, text)
  throw new Error('OPENAI_API_KEY not set for simulator embedding retrieval')
}
