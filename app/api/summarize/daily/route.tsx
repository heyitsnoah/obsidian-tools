import { TextBlock } from '@anthropic-ai/sdk/resources/messages.mjs'
import dayjs from 'dayjs'
import getUrls from 'get-urls'

import { getDailySummarySystemPrompt } from '@/prompts/summarize/daily-summary-user'
import { RecentFile } from '@/types/files'
import { UrlBodies } from '@/types/urls'
import { anthropic, openai } from '@/utils/ai'
import { createOrUpdateFile, octokit } from '@/utils/github'
import { redis } from '@/utils/redis'
import { publishToUpstash } from '@/utils/upstash'
import { getUrlKeys, storeUrls } from '@/utils/urls'
export const maxDuration = 300

const EXCLUDED_TERMS: string[] = []
if (process.env.DAILY_SUMMARY_NAME) {
  EXCLUDED_TERMS.push(process.env.DAILY_SUMMARY_NAME)
}
if (process.env.WEEKLY_SUMMARY_NAME) {
  EXCLUDED_TERMS.push(process.env.WEEKLY_SUMMARY_NAME)
}
if (process.env.MONTHLY_SUMMARY_NAME) {
  EXCLUDED_TERMS.push(process.env.MONTHLY_SUMMARY_NAME)
}
async function getRecentFiles(
  owner: string,
  repo: string
): Promise<RecentFile[]> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString()

  try {
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since: twentyFourHoursAgo,
    })

    const recentFiles: Set<string> = new Set()

    for (const commit of commits) {
      const { data: commitData } = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: commit.sha,
      })

      commitData.files?.forEach((file) => {
        if (
          file.filename.endsWith('.md') &&
          !EXCLUDED_TERMS.some((term) => file.filename.includes(term))
        ) {
          recentFiles.add(file.filename)
        }
      })
    }

    const files: RecentFile[] = []

    for (const filename of recentFiles) {
      try {
        console.log(`Fetching content for file: ${filename}`)
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: filename,
        })
        if (data && typeof data === 'object' && 'type' in data) {
          if (
            data.type === 'file' &&
            'content' in data &&
            typeof data.content === 'string'
          ) {
            const body = Buffer.from(data.content, 'base64').toString('utf-8')
            files.push({ filename, body })
          } else if (data.type === 'symlink' || data.type === 'submodule') {
            console.log(`${filename} is a ${data.type}, skipping...`)
          } else {
            console.log(`Unexpected data type for ${filename}: ${data.type}`)
          }
        } else {
          console.log(`Unexpected data format for ${filename}`)
        }
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any).status === 404) {
          console.log(`File not found (possibly deleted): ${filename}`)
        } else {
          console.error(`Error fetching content for ${filename}:`, error)
        }
      }
    }

    return files
  } catch (error) {
    console.error('Error in getRecentFiles:', error)
    throw error
  }
}

export async function GET() {
  //   if (
  //     req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`
  //   ) {
  //     return new Response('Unauthorized', { status: 401 })
  //   }
  const owner = process.env.GITHUB_USERNAME!
  const repo = process.env.GITHUB_REPO!

  const recentFiles = await getRecentFiles(owner, repo)
  // console.log(recentFiles)
  const urlKeys = getUrlKeys()
  const exists = await redis.exists(urlKeys.urlBodiesKey)
  if (!exists) {
    const urls: string[] = []
    recentFiles.map((file) => {
      getUrls(file.body).forEach((url) => {
        urls.push(url)
      })
    })
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You will be given an array of URLs. Your job is to return the urls that represent valuable content, not the ones that are generic, redirects, generic, shortened, and otherwise not useful. Return urls in this JSON format: {usefulUrls: string[]}',
        },
        {
          role: 'user',
          content: `URLs: ${JSON.stringify(urls)}}\nUseful URLs:`,
        },
      ],
      response_format: { type: 'json_object' },
    })
    if (!openaiResponse.choices[0].message.content) {
      return new Response('No content found in response', { status: 500 })
    }
    const parsed = JSON.parse(openaiResponse.choices[0].message.content)
    await storeUrls(urlKeys.urlQueueKey, parsed.usefulUrls)
    await publishToUpstash('/api/summarize/urls/scrape', {
      urlQueueKey: urlKeys.urlQueueKey,
      urlBodiesKey: urlKeys.urlBodiesKey,
      urlProcessedKey: urlKeys.urlProcessedKey,
    })
    return new Response('processing urls', { status: 200 })
  }
  const response = await anthropic.messages.create({
    messages: [
      { role: 'user', content: getDailySummarySystemPrompt(recentFiles) },
    ],
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 4000,
  })

  if (!response) {
    return new Response('No content found in response', { status: 500 })
  }
  let responseContent = (response.content[0] as TextBlock).text
  const filename = `${process.env.DAILY_SUMMARY_NAME} ${dayjs().format(
    'YYYY-MM-DD'
  )}.md`
  const urlBodies: UrlBodies | null = await redis.hgetall(urlKeys.urlBodiesKey)
  if (urlBodies) {
    const insertUrls = (
      responseContent: string,
      urlBodies: UrlBodies
    ): string => {
      const urlsList = Object.entries(urlBodies)
        .map(([url, content]) => {
          if (content) {
            const { title, summary } = content
            return `- [${title}](${url})${summary ? `\n    - ${summary}` : ''}`
          }
          return ''
        })
        .join('\n')

      const actionItemsIndex = responseContent.indexOf('\n\n## Action Items')

      if (actionItemsIndex === -1) {
        // If "## Action Items" is not found, just append the URL list at the end
        return `${responseContent}\n\n## Urls\n${urlsList}`
      }

      const beforeActionItems = responseContent.slice(0, actionItemsIndex)
      const afterActionItems = responseContent.slice(actionItemsIndex)

      return `${beforeActionItems}\n\n## Urls\n${urlsList}${afterActionItems}`
    }
    responseContent = insertUrls(responseContent, urlBodies)
  }
  console.log(responseContent)
  await createOrUpdateFile({
    filename,
    content: responseContent,
    path: process.env.DAILY_SUMMARY_FOLDER,
    inbox: true,
  })
  return new Response('created file', { status: 200 })
}
