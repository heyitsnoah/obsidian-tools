import { NextRequest } from 'next/server'

import { RouteMessageMap } from '@/types/upstash'
import { verifyUpstashSignature } from '@/utils/upstash'
import { processUrl } from '@/utils/urls'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const body: RouteMessageMap['/api/summarize/urls/scrape'] =
    await verifyUpstashSignature(req)
  await processUrl(body.url, body.keys.urlsKey)

  return new Response('ok', { status: 200 })
}
