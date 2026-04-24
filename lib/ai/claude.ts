import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-6'

interface CallClaudeOptions {
  temperature?: number
  maxTokens?: number
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options: CallClaudeOptions = {},
): Promise<string> {
  const { temperature = 0.5, maxTokens = 2000 } = options

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text
}

export async function callClaudeJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options: CallClaudeOptions = {},
): Promise<T> {
  const text = await callClaude(systemPrompt, userPrompt, options)

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    return JSON.parse(jsonMatch[0]) as T
  } catch {
    // Retry once with explicit JSON instruction
    const retryText = await callClaude(
      systemPrompt,
      userPrompt + '\n\nIMPORTANTE: Responda SOMENTE JSON válido, sem texto antes ou depois.',
      options,
    )
    const jsonMatch = retryText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude returned invalid JSON after retry')
    return JSON.parse(jsonMatch[0]) as T
  }
}
