import { NextRequest, NextResponse } from 'next/server'
import TurndownService from 'turndown'

import { EmailMessageRawBody } from '@/types/email'
import { createOrUpdateFile, sanitizeFilename } from '@/utils/github'
export async function POST(req: NextRequest) {
  const searchParams = new URLSearchParams(req.url.split('?')[1])

  if (
    !searchParams.has('token') ||
    searchParams.get('token') !== process.env.SECRET_KEY
  ) {
    console.error('Unauthorized')
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const body: EmailMessageRawBody = await req.json()

    console.log('Received body:', JSON.stringify(body, null, 2))

    const turndownService = new TurndownService()

    const markdown = turndownService.turndown(body.HtmlBody || body.TextBody)
    console.log('Converted markdown:', `${markdown.substring(0, 500)}...`)

    const subject = body.Subject || 'Untitled Email'
    const filename = `${sanitizeFilename(subject)}.md`

    const fileId = await createOrUpdateFile({ filename, content: markdown })

    return NextResponse.json(
      { status: 'File created/updated successfully', fileId },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error in POST handler:', error)
    return NextResponse.json(
      {
        status: 'Error',
        message: 'Failed to create or update file',
        details: `GitHub Username: ${process.env.GITHUB_USERNAME}, Repo: ${process.env.GITHUB_REPO}, Path: ${process.env.OBSIDIAN_INBOX_PATH}`,
      },
      { status: 500 },
    )
  }
}
