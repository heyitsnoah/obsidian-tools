import { getDailySummarySystemPrompt } from '@/prompts/summarize/daily-summary-system'
import { RecentFile } from '@/types/files'
import { anthropic } from '@/utils/ai'
import { createOrUpdateFile, octokit } from '@/utils/github'
import {
  ContentBlock,
  TextBlock,
} from '@anthropic-ai/sdk/resources/messages.mjs'
import dayjs from 'dayjs'
import { NextRequest, NextResponse } from 'next/server'

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
        if (file.filename.endsWith('.md')) {
          recentFiles.add(file.filename)
        }
      })
    }

    const files: RecentFile[] = []

    for (const filename of recentFiles) {
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: filename,
        })

        if ('content' in data && typeof data.content === 'string') {
          const body = Buffer.from(data.content, 'base64').toString('utf-8')
          files.push({ filename, body })
        } else {
          console.log(`Unexpected data format for ${filename}`)
        }
      } catch (error) {
        if ((error as any).status === 404) {
          console.log(`File not found (possibly deleted): ${filename}`)
        } else {
          console.error(`Error fetching content for ${filename}:`, error)
        }
      }
    }

    return files
  } catch (error) {
    throw error
  }
}

export async function GET(req: NextRequest) {
  const owner = process.env.GITHUB_USERNAME!
  const repo = process.env.GITHUB_REPO!

  const recentFiles = await getRecentFiles(owner, repo)

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

  //   console.log(response)
  const responseContent = (response.content[0] as TextBlock).text
  const filename = `DAILY SUMMARY ${dayjs().format('YYYY-MM-DD')}.md`
  await createOrUpdateFile({
    filename,
    content: responseContent,
    path: 'Daily Summaries',
    inbox: true,
  })
  return new Response('Success', { status: 200 })
}
