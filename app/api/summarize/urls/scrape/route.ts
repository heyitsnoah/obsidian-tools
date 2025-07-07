import type { RouteMessageMap } from '@/types/upstash'
import type { NextRequest } from 'next/server'

import { verifyUpstashSignature } from '@/utils/upstash'
import { processUrl } from '@/utils/urls'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const body = await verifyUpstashSignature(req) as RouteMessageMap['/api/summarize/urls/scrape']
  await processUrl(body.url, body.keys.urlsKey)

  return new Response('ok', { status: 200 })
}
