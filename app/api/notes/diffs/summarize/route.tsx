import { NextRequest } from 'next/server'

import { getDiffSummarizationPrompt } from '@/prompts/notes/note-summary-user'
import { RouteMessageMap } from '@/types/upstash'
import { generateAiText } from '@/utils/ai'
import { getRedis } from '@/utils/redis'
import { verifyUpstashSignature } from '@/utils/upstash'

export async function POST(req: NextRequest) {
  console.log('/api/notes/diffs/summarize')

  const body: RouteMessageMap['/api/notes/diffs/summarize'] =
    await verifyUpstashSignature(req)
  const responseContent = await generateAiText({
    prompt: getDiffSummarizationPrompt(body.diff.diff),
  })
  if (!responseContent) {
    return new Response('No content found in response', { status: 500 })
  }
  const redis = getRedis()
  await redis.hset(body.keys.notesKey, {
    [body.diff.filename]: responseContent.trim(),
  })
  await redis.expire(body.keys.notesKey, 86400) // Set TTL for 24 hours
  return new Response('ok', { status: 200 })
}
