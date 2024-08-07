import { NextRequest } from 'next/server'

import { getNoteSummarizationPrompt } from '@/prompts/notes/note-summary-user'
import { RouteMessageMap } from '@/types/upstash'
import { openai } from '@/utils/ai'
import { redis } from '@/utils/redis'
import { verifyUpstashSignature } from '@/utils/upstash'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  console.log('POST /api/notes/summarize')
  const body: RouteMessageMap['/api/notes/summarize'] =
    await verifyUpstashSignature(req)
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'user',
        content: getNoteSummarizationPrompt(body.note.filename, body.note.body),
      },
    ],
  })
  //   const response = await anthropic.messages.create({
  //     max_tokens: 1000,
  //     model: 'claude-3-5-sonnet-20240620',

  //     messages: [
  //       {
  //         role: 'user',
  //         content: getNoteSummarizationPrompt(body.note.filename, body.note.body),
  //       },
  //     ],
  //   })
  if (!response || !response.choices[0].message.content) {
    return new Response('No content found in response', { status: 500 })
  }
  //   const responseContent = (response.content[0] as TextBlock).text
  const responseContent = response.choices[0].message.content
  await redis.hset(body.keys.notesKey, {
    [body.note.filename]: responseContent.trim(),
  })
  await redis.expire(body.keys.notesKey, 86400) // Set TTL for 24 hours
  return new Response('ok', { status: 200 })
}
