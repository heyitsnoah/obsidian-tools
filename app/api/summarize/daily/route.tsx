import dayjs from 'dayjs'
import getUrls from 'get-urls'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { RecentDiff, RecentFile } from '@/types/files'
import { RouteMessageMap } from '@/types/upstash'
import { openai } from '@/utils/ai'
import { octokit } from '@/utils/github'
import { getQueueKeys } from '@/utils/redis-queue'
import { publishToUpstash, verifyUpstashSignature } from '@/utils/upstash'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
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

const UsefulUrls = z.object({
  usefulUrls: z.array(z.string()),
})

async function getRecentFiles(
  owner: string,
  repo: string
): Promise<{ files: RecentFile[]; diffs: RecentDiff[] }> {
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
    const diffs: RecentDiff[] = []

    for (const filename of recentFiles) {
      try {
        console.log(`Fetching content for file: ${filename}`)
        const listCommits = await octokit.rest.repos.listCommits({
          owner,
          repo,
          path: filename,
        })
        const oldestCommit = listCommits.data.reduce((oldest, commit) => {
          const commitDate = new Date(commit.commit.committer?.date || '')
          return commitDate < oldest ? commitDate : oldest
        }, new Date())

        if (dayjs().diff(oldestCommit, 'hours') >= 24) {
          console.log(
            `File ${filename} is older than 24 hours, fetching diff...`
          )
          const latestCommit = listCommits.data[0].sha
          const { data: diffData } = await octokit.rest.repos.compareCommits({
            owner,
            repo,
            base: `${latestCommit}~1`,
            head: latestCommit,
          })
          const fileDiff = diffData.files?.find(
            (file) => file.filename === filename
          )
          if (fileDiff && fileDiff.patch) {
            diffs.push({ filename, diff: fileDiff.patch })
          }
        } else {
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

    return { files, diffs }
  } catch (error) {
    console.error('Error in getRecentFiles:', error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  const body: RouteMessageMap['/api/summarize/daily'] =
    await verifyUpstashSignature(req)
  console.log('/api/summarize/daily')
  console.log(body)
  // *******************************************
  // todo:
  // 1. get all the files from the last 24 hours
  // 2. update the prompt to take all teh file summaries
  // 3. get rid of the action items
  // 4. clean up the extra code
  // *******************************************

  // const response = await anthropic.messages.create({
  //   messages: [
  //     { role: 'user', content: getDailySummarySystemPrompt(recentFiles) },
  //   ],
  //   model: 'claude-3-5-sonnet-20240620',
  //   max_tokens: 4000,
  // })

  // if (!response) {
  //   return new Response('No content found in response', { status: 500 })
  // }
  // let responseContent = (response.content[0] as TextBlock).text
  // const filename = `${process.env.DAILY_SUMMARY_NAME} ${dayjs().format(
  //   'YYYY-MM-DD'
  // )}${process.env.NODE_ENV === 'development' && `-DEV`}.md`
  // const urlBodies: UrlBodies | null = await redis.hgetall(urlKeys.urlBodiesKey)
  // if (urlBodies) {
  //   const insertUrls = (
  //     responseContent: string,
  //     urlBodies: UrlBodies
  //   ): string => {
  //     const urlsList = Object.entries(urlBodies)
  //       .map(([url, content]) => {
  //         if (content) {
  //           const { title, summary } = content
  //           return `- [${title}](${url})${summary ? `\n    - ${summary}` : ''}`
  //         }
  //         return ''
  //       })
  //       .join('\n')

  //     const actionItemsIndex = responseContent.indexOf('\n\n## Action Items')

  //     if (actionItemsIndex === -1) {
  //       // If "## Action Items" is not found, just append the URL list at the end
  //       return `${responseContent}\n\n## Urls\n${urlsList}`
  //     }

  //     const beforeActionItems = responseContent.slice(0, actionItemsIndex)
  //     const afterActionItems = responseContent.slice(actionItemsIndex)

  //     return `${beforeActionItems}\n\n## Urls\n${urlsList}${afterActionItems}`
  //   }
  //   responseContent = insertUrls(responseContent, urlBodies)
  // }
  // console.log(responseContent)
  // await createOrUpdateFile({
  //   filename,
  //   content: responseContent,
  //   path: process.env.DAILY_SUMMARY_FOLDER,
  //   inbox: true,
  // })
  return new Response('ok', { status: 200 })
}

export async function GET(req: NextRequest) {
  if (
    req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV !== 'development'
  ) {
    return new Response('Unauthorized', { status: 401 })
  }
  const owner = process.env.GITHUB_USERNAME!
  const repo = process.env.GITHUB_REPO!

  const recentFiles = await getRecentFiles(owner, repo)
  // return new Response('ok', { status: 200 })
  const queue = 'daily-note-queue'
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
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You will be given an array of URLs. Your job is to return the urls that represent valuable content, not the ones that are generic (like google.com, yahoo.com, nytimes.com, cnn.com, etc.), redirects, generic, shortened, and otherwise not useful. Return urls in this JSON format: {usefulUrls: string[]}',
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
  let parsed
  try {
    parsed = UsefulUrls.parse(
      JSON.parse(openaiResponse.choices[0].message.content)
    )
  } catch (error) {
    console.error('Error parsing response:', error)
    return new Response('Error parsing response', { status: 500 })
  }

  for (const file of recentFiles.files) {
    await publishToUpstash(
      '/api/notes/summarize',
      { note: file, keys },
      {
        queue,
      }
    )
  }
  for (const diff of recentFiles.diffs) {
    await publishToUpstash(
      '/api/notes/diffs/summarize',
      { diff, keys },
      {
        queue,
      }
    )
  }
  for (const url of parsed.usefulUrls) {
    await publishToUpstash(
      '/api/summarize/urls/scrape',
      { url, keys },
      {
        queue,
      }
    )
  }
  await publishToUpstash('/api/summarize/daily', keys.notesKey, {
    queue,
  })
  return new Response('ok', { status: 200 })
}
