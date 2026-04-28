import { generateText, Output } from 'ai'
import { z } from 'zod'

export const GPT_5_5_MODEL = 'openai/gpt-5.5'

function getGpt55ProviderOptions() {
  return {
    openai: {
      reasoningEffort: 'high',
    },
    ...(process.env.OPENAI_API_KEY
      ? {
          gateway: {
            byok: {
              openai: [{ apiKey: process.env.OPENAI_API_KEY }],
            },
          },
        }
      : {}),
  } as const
}

type GenerateAiTextOptions = {
  prompt: string
  system?: string
}

type GenerateAiObjectOptions<T extends z.ZodType> = GenerateAiTextOptions & {
  schema: T
}

export function hasAiCredentials(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL,
  )
}

export async function generateAiText({
  prompt,
  system,
}: GenerateAiTextOptions): Promise<string> {
  const { text } = await generateText({
    model: GPT_5_5_MODEL,
    providerOptions: getGpt55ProviderOptions(),
    prompt,
    system,
  })

  return text
}

export async function generateAiObject<T extends z.ZodType>({
  prompt,
  schema,
  system,
}: GenerateAiObjectOptions<T>): Promise<z.infer<T>> {
  const { output } = await generateText({
    model: GPT_5_5_MODEL,
    output: Output.object({ schema }),
    providerOptions: getGpt55ProviderOptions(),
    prompt,
    system,
  })

  return schema.parse(output)
}

/**
 * Validates that a string contains valid markdown content
 * @param content The content to validate
 * @returns true if content is valid markdown, false otherwise
 */
export function validateMarkdownContent(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false
  }
  
  // Basic validation - ensure it's not empty and has some content
  const trimmed = content.trim()
  if (trimmed.length === 0) {
    return false
  }
  
  // Check for suspicious content that might indicate an error
  const errorPatterns = [
    /^error:/i,
    /^failed to/i,
    /^unable to/i,
    /^cannot/i,
  ]
  
  for (const pattern of errorPatterns) {
    if (pattern.test(trimmed)) {
      return false
    }
  }
  
  return true
}

export async function extractJson<T extends z.ZodType>(
  string: string,
  zodType: T,
): Promise<z.infer<T>> {
  return generateAiObject({
    prompt: string,
    schema: zodType,
    system:
      "Please extract the JSON object from the user's text. Return only data that matches the requested schema.",
  })
}
