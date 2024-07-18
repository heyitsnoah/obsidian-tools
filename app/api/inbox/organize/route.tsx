import { octokit } from '@/utils/github'
import { NextRequest, NextResponse } from 'next/server'

interface RepoItem {
  name: string
  type: 'file' | 'dir'
  path: string
  children?: RepoItem[]
}

interface InboxNote {
  title: string
  body: string
}

interface ApiResponse {
  markdownTree: string
  inboxNotes: InboxNote[]
}

async function getRepoContentsRecursive(
  owner: string,
  repo: string,
  path: string = ''
): Promise<RepoItem[]> {
  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  })

  const contents: RepoItem[] = []

  if (Array.isArray(response.data)) {
    for (const item of response.data) {
      if (item.name === '.obsidian') continue // Skip .obsidian folder

      if (item.type === 'dir') {
        const children = await getRepoContentsRecursive(owner, repo, item.path)
        contents.push({
          name: item.name,
          type: 'dir',
          path: item.path,
          children,
        })
      } else {
        contents.push({
          name: item.name,
          type: 'file',
          path: item.path,
        })
      }
    }
  }

  return contents
}

async function getInboxNotes(
  owner: string,
  repo: string,
  inboxPath: string
): Promise<InboxNote[]> {
  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: inboxPath,
  })

  const notes: InboxNote[] = []

  if (Array.isArray(response.data)) {
    for (const item of response.data) {
      if (item.type === 'file' && item.name.endsWith('.md')) {
        const fileContent = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: item.path,
        })

        if ('content' in fileContent.data) {
          const content = Buffer.from(
            fileContent.data.content,
            'base64'
          ).toString('utf-8')
          const lines = content.split('\n')
          const title = lines[0].replace(/^#\s*/, '').trim() // Remove leading '#' if present
          const body = lines.slice(1).join('\n').trim()

          notes.push({ title, body })
        }
      }
    }
  }

  return notes
}

function formatAsMarkdown(items: RepoItem[], depth: number = 0): string {
  let markdown = ''
  for (const item of items) {
    const indent = '  '.repeat(depth)
    markdown += `${indent}${item.type === 'dir' ? '- ' : ''}${item.name}${
      item.type === 'dir' ? '/' : ''
    }\n`
    if (item.children) {
      markdown += formatAsMarkdown(item.children, depth + 1)
    }
  }
  return markdown
}

export async function GET(req: NextRequest) {
  try {
    const owner = process.env.GITHUB_USERNAME!
    const repo = process.env.GITHUB_REPO!
    const inboxPath = process.env.OBSIDIAN_INBOX_PATH!

    const contents = await getRepoContentsRecursive(owner, repo)
    const markdownTree = formatAsMarkdown(contents)

    const inboxNotes = await getInboxNotes(owner, repo, inboxPath)
    console.log('Inbox notes:', inboxNotes)
    const response: ApiResponse = {
      markdownTree,
      inboxNotes,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error fetching repo contents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repo contents' },
      { status: 500 }
    )
  }
}
