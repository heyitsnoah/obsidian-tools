import dayjs from 'dayjs'
import { Octokit } from 'octokit'

import { RecentDiff, RecentFile } from '@/types/files'
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

export async function createOrUpdateFile({
  filename,
  content,
  path = '',
  inbox = true,
}: {
  filename: string
  content: string
  path?: string
  inbox?: boolean
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
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    let sha = ''
    if (checkResponse.status === 200) {
      const data = await checkResponse.json()
      sha = data.sha
    }

    const body = {
      message: `Add or update ${filename}`,
      content: base64Content,
      sha: sha || undefined,
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

async function getOriginalCreationDate(filename: string): Promise<Date | null> {
  try {
    let currentFilename = filename
    let earliestDate: Date | null = null
    let continueSearch = true

    while (continueSearch) {
      const { data: commits } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        path: currentFilename,
        per_page: 100, // Adjust as needed
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
        repo,
        ref: lastCommit.sha,
      })

      const renamedFile = commitData.files?.find(
        (file) =>
          file.filename === currentFilename && file.status === 'renamed',
      )
      if (renamedFile && renamedFile.previous_filename) {
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

export async function getRecentFiles(
  owner: string,
  repo: string,
): Promise<{ files: RecentFile[]; diffs: RecentDiff[] }> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
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
          repo,
          path: filename,
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
            owner,
            repo,
            base: `${latestCommit}~1`,
            head: latestCommit,
          })
          const fileDiff = diffData.files?.find(
            (file) => file.filename === filename,
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

    return { files, diffs }
  } catch (error) {
    console.error('Error in getRecentFiles:', error)
    throw error
  }
}
