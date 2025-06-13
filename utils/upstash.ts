import type { RouteMessageMap, UpstashRoute } from '@/types/upstash'
import type { NextRequest } from 'next/server'

import { Client, Receiver } from '@upstash/qstash'
import pako from 'pako'
import getByteLength from 'string-byte-length'

const gzip = (input: string): Buffer => {
  return Buffer.from(pako.gzip(input))
}
const client = new Client({ token: process.env.QSTASH_TOKEN! })

const r = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})
interface UpstashHeaders {
  'Authorization': string
  'Content-Encoding'?: string
  'Content-Type': string
  'Upstash-Delay'?: string
  'Upstash-Forward-Delay-Applied'?: string
  'Upstash-Method'?: string
  'Upstash-Not-Before'?: string
}
export const upstashHeaders: UpstashHeaders = {
  'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
  'Content-Type': 'application/json',
}

export async function getUpstashQueue(queueName: string) {
  const queue = client.queue({ queueName })
  const queueInfo = await queue.get()
  return queueInfo
}

export async function publishToUpstash<Route extends UpstashRoute>(
  url: Route,
  message: RouteMessageMap[Route],
  options?: {
    absoluteDelay?: string
    delay?: number
    queue?: string
    queueParallelism?: number
    upstashMethod?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
  }
) {
  console.log('Publishing to Upstash')
  console.log('URL: ', url)
  const urlPath = `https://${process.env.NEXT_PUBLIC_SITE_URL}${url}`
  if (options?.queue) {
    const queue = client.queue({ queueName: options.queue })
    if (options.queueParallelism) {
      await queue.upsert({ parallelism: options.queueParallelism })
    }
    await queue.enqueueJSON({
      body: message,
      url: urlPath,
    })
    return
  }
  if (options?.absoluteDelay) {
    // figure out seconds of absolute delay
    const secondsFromNow =
      Number(options.absoluteDelay) - Math.floor(Date.now() / 1000)
    console.log('Absolute Delay: ', secondsFromNow)
  }

  const headers: UpstashHeaders = { ...upstashHeaders }
  if (options?.delay) {
    headers['Upstash-Delay'] = `${options.delay}s`
    console.log('Delay: ', options.delay)
    headers['Upstash-Forward-Delay-Applied'] = `${options.delay}`
  }
  if (options?.absoluteDelay) {
    headers['Upstash-Not-Before'] = options.absoluteDelay
  }
  if (options?.upstashMethod) {
    headers['Upstash-Method'] = options.upstashMethod
  }
  let messageToSend: Buffer | string = JSON.stringify(message)
  const size = getByteLength(messageToSend)
  console.log('Size: ', size)

  if (size > 1000000) {
    console.log('Message too large, compressing...')
    headers['Content-Type'] = 'application/octet-stream'
    headers['Content-Encoding'] = 'gzip'
    messageToSend = gzip(messageToSend)
  }
  console.log(`${process.env.QSTASH_URL}${urlPath}`)

  const response = await fetch(`${process.env.QSTASH_URL}${urlPath}`, {
    body: messageToSend,
    headers: headers as Record<string, string>,
    method: 'POST',
  })
  if (response.ok) {
    console.log('Successfully published to Upstash')
    return response.json() as Promise<unknown>
  }
  console.log('Error publishing to Upstash')
  console.log('Status: ', response.status)
  // console.log('Message: ', message)
  // console.log(await response.json())
  throw new Error('Error publishing to Upstash')
}

export async function verifyUpstashSignature(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('Upstash-Signature') ?? ''
  try {
    const isValid = await r.verify({ body, signature })
    if (!isValid) {
      console.log('Invalid signature')
      throw new Error('Invalid signature')
    }
  } catch (err) {
    console.log('Caught Error: ', err)
    throw new Error('Invalid signature')
  }
  return JSON.parse(body) as unknown
}
