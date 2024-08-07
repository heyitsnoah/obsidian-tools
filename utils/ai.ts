import { generateSchema } from '@anatine/zod-openapi'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { z, ZodType } from 'zod'

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
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Please extract the JSON object from the user's text. Use the following OpenAPI schema: ${generateSchema(zodType)}`,
      },
      {
        role: 'user',
        content: string,
      },
    ],
  })

  if (!response || !response.choices[0].message.content) {
    throw new Error('No content found in response')
  }

  const parsedContent = JSON.parse(response.choices[0].message.content)
  return zodType.parse(parsedContent)
}
