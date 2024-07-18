import { NextRequest, NextResponse } from 'next/server'
import TurndownService from 'turndown'

import { EmailMessageRawBody } from '@/types/email'

function btoa(str: string) {
  return Buffer.from(str).toString('base64')
}

function sanitizeFilename(filename: string): string {
  // Remove "Fwd:" or "FWD:" from the beginning of the filename
  let sanitized = filename.replace(/^(?:Fwd:|FWD:)\s*/i, '')

  // Remove or replace characters not allowed in Obsidian filenames
  sanitized = sanitized
    .replace(/[/\\:*?"<>|]/g, '') // Remove characters not allowed in filenames
    .replace(/\.+$/g, '') // Remove trailing dots
    .trim() // Trim whitespace from start and end

  return sanitized
}

async function createOrUpdateFile(filename: string, content: string) {
  const owner = process.env.GITHUB_USERNAME!
  const repo = process.env.GITHUB_REPO!
  const path = `${process.env.OBSIDIAN_INBOX_PATH}/${filename}`
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}`
  const base64Content = btoa(content)

  console.log(`Attempting to create/update file: ${path}`)

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
      errorText
    )
    throw new Error(`GitHub API error: ${response.status} ${errorText}`)
  } catch (error) {
    console.error('Error in createOrUpdateFile:', error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  const body: EmailMessageRawBody = await req.json()
  try {
    console.log('Received body:', JSON.stringify(body, null, 2))

    const turndownService = new TurndownService()

    const markdown = turndownService.turndown(body.HtmlBody || body.TextBody)
    console.log('Converted markdown:', `${markdown.substring(0, 500)}...`)

    const subject = body.Subject || 'Untitled Email'
    const filename = `${sanitizeFilename(subject)}.md`

    const fileId = await createOrUpdateFile(filename, markdown)

    return NextResponse.json(
      { status: 'File created/updated successfully', fileId },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in POST handler:', error)
    return NextResponse.json(
      {
        status: 'Error',
        message: 'Failed to create or update file',
        details: `GitHub Username: ${process.env.GITHUB_USERNAME}, Repo: ${process.env.GITHUB_REPO}, Path: ${process.env.OBSIDIAN_INBOX_PATH}`,
      },
      { status: 500 }
    )
  }
}
