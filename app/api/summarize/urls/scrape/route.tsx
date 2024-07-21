import { NextRequest } from 'next/server'

import { RouteMessageMap } from '@/types/upstash'
import { publishToUpstash, verifyUpstashSignature } from '@/utils/upstash'
import { processUrl } from '@/utils/urls'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const body: RouteMessageMap['/api/summarize/urls/scrape'] =
    await verifyUpstashSignature(req)
  const urlCount = await processUrl(
    body.urlQueueKey,
    body.urlBodiesKey,
    body.urlProcessedKey
  )
  if (urlCount !== 0) {
    console.log('Urls remaining: ', urlCount)
    await publishToUpstash('/api/summarize/urls/scrape', body)
    return new Response('ok', { status: 200 })
  }
  console.log('Processing complete')
  await fetch(
    `https://${process.env.NEXT_PUBLIC_SITE_URL}/api/summarize/daily`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    }
  )

  return new Response('ok', { status: 200 })
}
