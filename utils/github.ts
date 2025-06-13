import type { RecentDiff, RecentFile } from '@/types/files'

import dayjs from 'dayjs'
import { Octokit } from 'octokit'

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
export const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN })

function btoa(str: string) {
  return Buffer.from(str).toString('base64')
}
const owner = process.env.GITHUB_USERNAME!
const repo = process.env.GITHUB_REPO!
export async function createOrUpdateFile({
  content,
  filename,
  inbox = true,
  path = '',
}: {
  content: string
  filename: string
  inbox?: boolean
  path?: string
}) {
  const owner = process.env.GITHUB_USERNAME!
  const repo = process.env.GITHUB_REPO!

  let filePath = ''
  if (inbox && process.env.OBSIDIAN_INBOX_PATH) {
    filePath += process.env.OBSIDIAN_INBOX_PATH
  }

  if (path) {
    filePath += path.startsWith('/') ? path : `/${path}`
  }

  filePath += `/${filename}`

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
    filePath,
  )}`
  const base64Content = btoa(content)

  console.log(`Attempting to create/update file: ${filePath}`)

  try {
    // Check if the file already exists
    const checkResponse = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
      },
      method: 'GET',
    })

    let sha = ''
    if (checkResponse.status === 200) {
      const data = await checkResponse.json()
      sha = data.sha
    }

    const body = {
      content: base64Content,
      message: `Add or update ${filename}`,
      sha: sha || undefined,
    }

    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    })

    if (response.ok) {
      const data = await response.json()
      console.log('File created or updated successfully')
      return data.content.sha
    }
    const errorText = await response.text()
    console.error(
      'Error creating or updating file:',
      response.status,
      errorText,
    )
    throw new Error(`GitHub API error: ${response.status} ${errorText}`)
  } catch (error) {
    console.error('Error in createOrUpdateFile:', error)
    throw error
  }
}

export async function getDailySummaries(
  owner: string,
  repo: string,
): Promise<RecentFile[]> {
  const today = dayjs().startOf('day')
  const dailySummaryName = process.env.DAILY_SUMMARY_NAME || 'Daily Summary'
  const summaries: RecentFile[] = []

  try {
    for (let i = 0; i < 7; i++) {
      const date = today.subtract(i, 'day')
      const formattedDate = date.format('YYYY-MM-DD')
      const searchQuery = `${dailySummaryName} ${formattedDate} in:path repo:${owner}/${repo}`

      console.log(`Searching for: ${searchQuery}`)

      const searchResult = await octokit.rest.search.code({
        q: searchQuery,
      })

      if (searchResult.data.items.length > 0) {
        const item = searchResult.data.items[0]
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          path: item.path,
          repo,
        })

        if ('content' in fileData && typeof fileData.content === 'string') {
          const body = Buffer.from(fileData.content, 'base64').toString('utf-8')
          summaries.push({ body, filename: item.path })
          console.log(`+ Fetched daily summary for ${formattedDate}`)
        }
      } else {
        console.log(`Daily summary not found for ${formattedDate}`)
      }
    }

    return summaries.reverse() // Reverse to get chronological order
  } catch (error) {
    console.error('Error in getDailySummaries:', error)
    throw error
  }
}

export async function getRecentFiles(
  owner: string,
  repo: string,
): Promise<{ diffs: RecentDiff[]; files: RecentFile[]; }> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString()

  try {
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since: twentyFourHoursAgo,
    })

    const recentFiles = new Set<string>()

    for (const commit of commits) {
      const { data: commitData } = await octokit.rest.repos.getCommit({
        owner,
        ref: commit.sha,
        repo,
      })
      if (!commitData.files) {
        continue
      }
      for (const file of commitData.files) {
        if (file.status === 'renamed' && file.previous_filename) {
          const additions = file.additions
          const originalCreationDate = await getOriginalCreationDate(
            file.filename,
          )
          if (
            additions === 0 &&
            originalCreationDate &&
            dayjs().diff(originalCreationDate, 'hours') >= 24
          ) {
            console.info(
              '- Skipping renamed file with no additions:',
              file.filename,
            )
            continue
          }
        }
        if (
          file.filename.endsWith('.md') &&
          !EXCLUDED_TERMS.some(
            (term) => file.filename.includes(term) && file.status !== 'renamed',
          )
        ) {
          recentFiles.add(file.filename)
        }
      }
    }

    const files: RecentFile[] = []
    const diffs: RecentDiff[] = []

    for (const filename of recentFiles) {
      try {
        const listCommits = await octokit.rest.repos.listCommits({
          owner,
          path: filename,
          repo,
        })
        const oldestCommit = listCommits.data.reduce((oldest, commit) => {
          const commitDate = new Date(commit.commit.committer?.date || '')
          return commitDate < oldest ? commitDate : oldest
        }, new Date())

        if (dayjs().diff(oldestCommit, 'hours') >= 24) {
          console.log(
            `+ File ${filename} is older than 24 hours, fetching diff...`,
          )
          const latestCommit = listCommits.data[0].sha
          const { data: diffData } = await octokit.rest.repos.compareCommits({
            base: `${latestCommit}~1`,
            head: latestCommit,
            owner,
            repo,
          })
          const fileDiff = diffData.files?.find(
            (file) => file.filename === filename,
          )
          if (fileDiff?.patch) {
            diffs.push({ diff: fileDiff.patch, filename })
          }
        } else {
          const { data } = await octokit.rest.repos.getContent({
            owner,
            path: filename,
            repo,
          })
          if (data && typeof data === 'object' && 'type' in data) {
            if (
              data.type === 'file' &&
              'content' in data &&
              typeof data.content === 'string'
            ) {
              const body = Buffer.from(data.content, 'base64').toString('utf-8')
              files.push({ body, filename })
              console.log(`+ Fetching content for file: ${filename}`)
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

    return { diffs, files }
  } catch (error) {
    console.error('Error in getRecentFiles:', error)
    throw error
  }
}

export function sanitizeFilename(filename: string): string {
  // Remove "Fwd:" or "FWD:" from the beginning of the filename
  let sanitized = filename.replace(/^(?:Fwd:|FWD:)\s*/i, '')

  // Remove or replace characters not allowed in Obsidian filenames
  sanitized = sanitized
    .replace(/[/\\:*?"<>|]/g, '') // Remove characters not allowed in filenames
    .replace(/\.+$/g, '') // Remove trailing dots
    .trim() // Trim whitespace from start and end

  return sanitized
}

async function getOriginalCreationDate(filename: string): Promise<Date | null> {
  try {
    let currentFilename = filename
    let earliestDate: Date | null = null
    let continueSearch = true

    while (continueSearch) {
      const { data: commits } = await octokit.rest.repos.listCommits({
        owner,
        path: currentFilename,
        per_page: 100, // Adjust as needed
        repo,
      })

      if (commits.length === 0) {
        continueSearch = false
        break
      }

      const lastCommit = commits[commits.length - 1]
      const commitDate = new Date(
        lastCommit.commit.committer?.date ||
          lastCommit.commit.author?.date ||
          '',
      )

      if (!earliestDate || commitDate < earliestDate) {
        earliestDate = commitDate
      }

      // Check if the file was renamed
      const { data: commitData } = await octokit.rest.repos.getCommit({
        owner,
        ref: lastCommit.sha,
        repo,
      })

      const renamedFile = commitData.files?.find(
        (file) =>
          file.filename === currentFilename && file.status === 'renamed',
      )
      if (renamedFile?.previous_filename) {
        currentFilename = renamedFile.previous_filename
      } else {
        continueSearch = false
      }
    }

    return earliestDate
  } catch (error) {
    console.error(
      `Error getting original creation date for ${filename}:`,
      error,
    )
    return null
  }
}
