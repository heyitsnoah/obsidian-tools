import type { RouteMessageMap } from '@/types/upstash'
import type { UrlBodies } from '@/types/urls'
import type { NextRequest } from 'next/server'

import {
  DAILY_SUMMARY_SYSTEM_PROMPT,
  getDailySummaryUserPrompt,
} from '@/prompts/summarize/daily-summary-user'
import { O3_CONFIG, openai, validateMarkdownContent } from '@/utils/ai'
import { formatCalendarEvents, getDaysEvents } from '@/utils/calendar'
import { createOrUpdateFile, getRecentFiles } from '@/utils/github'
import { redis } from '@/utils/redis'
import { getQueueKeys } from '@/utils/redis-queue'
import { publishToUpstash, verifyUpstashSignature } from '@/utils/upstash'
import dayjs from 'dayjs'
import getUrls from 'get-urls'
import { z } from 'zod'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const queue = 'daily-note-queue'

const UsefulUrls = z.object({
  usefulUrls: z.array(z.string()),
})

type RedisNotes = Record<string, string>;

export async function GET(req: NextRequest) {
  if (
    req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV !== 'development'
  ) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!process.env.YOUR_NAME || !process.env.OPENAI_API_KEY) {
    // Treating this as if user does not want daily summaries.
    return new Response('Missing environment variables', { status: 200 })
  }
  const owner = process.env.GITHUB_USERNAME!
  const repo = process.env.GITHUB_REPO!

  const recentFiles = await getRecentFiles(owner, repo)

  // return new Response('ok', { status: 200 })
  const keys = getQueueKeys(queue)

  console.log('running URLs')
  const urls: string[] = []
  recentFiles.files.map((file) => {
    getUrls(file.body).forEach((url) => {
      urls.push(url)
    })
  })
  recentFiles.diffs.map((diff) => {
    getUrls(diff.diff).forEach((url) => {
      urls.push(url)
    })
  })
  const openaiResponse = await openai.chat.completions.create({
    messages: [
      {
        content:
          'You will be given an array of URLs. Your job is to return the urls that represent valuable content, not the ones that are generic (like google.com, yahoo.com, nytimes.com, cnn.com, etc.), redirects, generic, shortened, and otherwise not useful. Return urls in this JSON format: {usefulUrls: string[]}',
        role: 'system',
      },
      {
        content: `URLs: ${JSON.stringify(urls)}}\nUseful URLs:`,
        role: 'user',
      },
    ],
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
  })
  if (!openaiResponse.choices[0].message.content) {
    return new Response('No content found in response', { status: 500 })
  }
  let parsed
  try {
    parsed = UsefulUrls.parse(
      JSON.parse(openaiResponse.choices[0].message.content),
    )
  } catch (error) {
    console.error('Error parsing response:', error)
    return new Response('Error parsing response', { status: 500 })
  }

  for (const file of recentFiles.files) {
    await publishToUpstash(
      '/api/notes/summarize',
      { keys, note: file },
      {
        queue,
      },
    )
  }
  for (const diff of recentFiles.diffs) {
    await publishToUpstash(
      '/api/notes/diffs/summarize',
      { diff, keys },
      {
        queue,
      },
    )
  }
  for (const url of parsed.usefulUrls) {
    await publishToUpstash(
      '/api/summarize/urls/scrape',
      { keys, url },
      {
        queue,
      },
    )
  }
  await publishToUpstash('/api/summarize/daily', keys, {
    queue,
  })
  return new Response('ok', { status: 200 })
}

export async function POST(req: NextRequest) {
  const body = await verifyUpstashSignature(req) as RouteMessageMap['/api/summarize/daily']
  console.log('/api/summarize/daily')

  const urlBodies: null | UrlBodies = await redis.hgetall(body.urlsKey)
  const notes: null | Record<string, string> = await redis.hgetall(
    body.notesKey,
  )
  let notesArray
  if (notes && Object.keys(notes).length > 0) {
    notesArray = Object.entries(notes).map(([filename, note]) => ({
      summary: note ?? '',
      title: filename,
    }))
  } else {
    return new Response('No notes found', { status: 200 })
  }
  let urlsArray
  if (urlBodies) {
    urlsArray = Object.entries(urlBodies).map(([url, content]) => ({
      summary: `${url}: ${content.summary ?? ''}`,
      title: content.title ?? '',
    }))
  }

  const formatInputs = (inputs: { summary: string; title: string; }[]) =>
    inputs.map((i) => `- ${i.title}: ${i.summary}`).join('\n')

  const notesString = `${notesArray ? formatInputs(notesArray) : ''}${
    urlsArray ? `\n${formatInputs(urlsArray)}` : ''
  }`.trim()

  const response = await openai.chat.completions.create({
    ...O3_CONFIG,
    messages: [
      { content: DAILY_SUMMARY_SYSTEM_PROMPT, role: 'system' },
      {
        content: getDailySummaryUserPrompt({
          date: dayjs(body.date).format('MMMM D, YYYY'),
          notes: notesString,
        }),
        role: 'user',
      },
    ],
  })

  if (!response.choices[0]?.message?.content) {
    return new Response('No content found in response', { status: 500 })
  }
  const responseString = response.choices[0].message.content
  
  if (!validateMarkdownContent(responseString)) {
    console.error('Invalid markdown content received from AI')
    return new Response('Invalid content in AI response', { status: 500 })
  }
  const filename = `${process.env.DAILY_SUMMARY_NAME} ${body.date}${process.env.NODE_ENV === 'development' ? '-DEV' : ''}.md`
  let eventsSection
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const events = await getDaysEvents()
    eventsSection = await formatCalendarEvents(events)
  }
  let responseContent = `# Daily Summary for ${dayjs(body.date).format('MMMM D, YYYY')}\n${eventsSection ? `## Calendar\n${eventsSection}\n` : ''}${responseString.trim()}`

  if (notes) {
    const insertNotes = (
      responseContent: string,
      notes: RedisNotes,
    ): string => {
      const notesList = Object.entries(notes)
        .map(([title, summary]) => {
          return `### [[${title.replace('.md', '')}]]\n${summary.replaceAll('<summary>', '').replaceAll('</summary>', '').trim()}`
        })
        .join('\n')

      return `${responseContent}\n---\n## Notes\n${notesList}`
    }
    responseContent = insertNotes(responseContent, notes)
  }
  if (urlBodies) {
    const insertUrls = (
      responseContent: string,
      urlBodies: UrlBodies,
    ): string => {
      const urlsList = Object.entries(urlBodies)
        .map(([url, content]) => {
          if (content) {
            const { summary, title } = content
            return `- [${title}](${url})${summary ? `: ${summary}` : ''}`
          }
          return ''
        })
        .join('\n')

      return `${responseContent}\n---\n## Urls\n${urlsList}`
    }
    responseContent = insertUrls(responseContent, urlBodies)
  }
  await createOrUpdateFile({
    content: responseContent,
    filename,
    inbox: true,
    path: process.env.DAILY_SUMMARY_FOLDER,
  })
  return new Response('ok', { status: 200 })
}