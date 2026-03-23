/**
 * OpenAI Client - For LLM responses (chat, panel questions)
 */
import OpenAI from 'openai'

export function getOpenAiApiKey(): string | undefined {
  const raw = process.env.OPENAI_API_KEY
  const t = typeof raw === 'string' ? raw.trim() : ''
  return t || undefined
}

const DEFAULT_MODEL = 'gpt-4o-mini'

export async function generateText(
  prompt: string,
  options: {
    model?: string
    maxTokens?: number
    temperature?: number
  } = {}
): Promise<string> {
  const apiKey = getOpenAiApiKey()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  try {
    const openai = new OpenAI({ apiKey })
    const response = await openai.chat.completions.create({
      model: options.model || DEFAULT_MODEL,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 500,
      messages: [{ role: 'user', content: prompt }],
    })
    return response.choices[0]?.message?.content?.trim() || ''
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error generating text with OpenAI:', error)
    throw new Error(`Failed to generate text: ${message}`)
  }
}

/**
 * Check if content is safe using OpenAI moderation
 */
export async function checkContentSafety(text: string): Promise<{
  isSafe: boolean
  blockedCategories: string[]
}> {
  try {
    const apiKey = getOpenAiApiKey()
    if (!apiKey) return { isSafe: false, blockedCategories: ['MISSING_OPENAI_API_KEY'] }
    const openai = new OpenAI({ apiKey })
    const mod = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: text,
    })
    const result = mod.results?.[0]
    if (!result) return { isSafe: true, blockedCategories: [] }

    const blockedCategories = Object.entries(result.categories || {})
      .filter(([, flagged]) => flagged === true)
      .map(([name]) => name)
    return { isSafe: blockedCategories.length === 0, blockedCategories }
  } catch (error: unknown) {
    console.error('Error checking content safety:', error)
    return { isSafe: false, blockedCategories: ['UNKNOWN'] }
  }
}
