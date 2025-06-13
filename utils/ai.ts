import type { z, ZodType } from 'zod'

import { generateSchema } from '@anatine/zod-openapi'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const openai = new OpenAI({
  organization: process.env.OPENAI_ORGANIZATION_ID,
})

export async function extractJson<T extends ZodType>(
  string: string,
  zodType: T,
): Promise<z.infer<T>> {
  const schema = generateSchema(zodType)
  const response = await openai.chat.completions.create({
    messages: [
      {
        content: `Please extract the JSON object from the user's text. Use the following OpenAPI schema: ${JSON.stringify(schema)}`,
        role: 'system',
      },
      {
        content: string,
        role: 'user',
      },
    ],
    model: 'gpt-4o-mini',
  })

  if (!response.choices[0]?.message?.content) {
    throw new Error('No content found in response')
  }

  const content = response.choices[0].message.content
  const parsedContent: unknown = JSON.parse(content)
  return zodType.parse(parsedContent)
}
