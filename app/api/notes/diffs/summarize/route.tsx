import { NextRequest } from 'next/server'

import { RouteMessageMap } from '@/types/upstash'
import { redis } from '@/utils/redis'
import { verifyUpstashSignature } from '@/utils/upstash'

export async function POST(req: NextRequest) {
  const body: RouteMessageMap['/api/notes/diffs/summarize'] =
    await verifyUpstashSignature(req)
  console.log('/api/notes/diffs/summarize')
  await redis.hset(body.keys.notesKey, {
    [body.diff.filename]: body.diff.diff,
  })
  await redis.expire(body.keys.notesKey, 86400) // Set TTL for 24 hours
  return new Response('ok', { status: 200 })
}
