import { TextBlock } from '@anthropic-ai/sdk/resources/messages.mjs'
import { NextRequest } from 'next/server'

import { getDiffSummarizationPrompt } from '@/prompts/notes/note-summary-user'
import { RouteMessageMap } from '@/types/upstash'
import { anthropic } from '@/utils/ai'
import { redis } from '@/utils/redis'
import { verifyUpstashSignature } from '@/utils/upstash'

export async function POST(req: NextRequest) {
  console.log('/api/notes/diffs/summarize')

  const body: RouteMessageMap['/api/notes/diffs/summarize'] =
    await verifyUpstashSignature(req)
  const response = await anthropic.messages.create({
    max_tokens: 1000,
    model: 'claude-3-5-sonnet-20240620',

    messages: [
      {
        role: 'user',
        content: getDiffSummarizationPrompt(body.diff.diff),
      },
    ],
  })
  if (!response) {
    return new Response('No content found in response', { status: 500 })
  }
  const responseContent = (response.content[0] as TextBlock).text
  await redis.hset(body.keys.notesKey, {
    [body.diff.filename]: responseContent.trim(),
  })
  await redis.expire(body.keys.notesKey, 86400) // Set TTL for 24 hours
  return new Response('ok', { status: 200 })
}
