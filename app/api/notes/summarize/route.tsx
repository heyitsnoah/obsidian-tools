import { NextRequest } from 'next/server'

import { getNoteSummarizationPrompt } from '@/prompts/notes/note-summary-user'
import { RouteMessageMap } from '@/types/upstash'
import { generateAiText } from '@/utils/ai'
import { getRedis } from '@/utils/redis'
import { verifyUpstashSignature } from '@/utils/upstash'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  console.log('POST /api/notes/summarize')
  const body: RouteMessageMap['/api/notes/summarize'] =
    await verifyUpstashSignature(req)
  const responseContent = await generateAiText({
    prompt: getNoteSummarizationPrompt(body.note.filename, body.note.body),
  })

  if (!responseContent) {
    return new Response('No content found in response', { status: 500 })
  }
  const redis = getRedis()
  await redis.hset(body.keys.notesKey, {
    [body.note.filename]: responseContent.trim(),
  })
  await redis.expire(body.keys.notesKey, 86400) // Set TTL for 24 hours
  return new Response('ok', { status: 200 })
}
