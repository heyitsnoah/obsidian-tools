import { Octokit } from 'octokit'

export const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN })

function btoa(str: string) {
  return Buffer.from(str).toString('base64')
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
    filePath
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
      errorText
    )
    throw new Error(`GitHub API error: ${response.status} ${errorText}`)
  } catch (error) {
    console.error('Error in createOrUpdateFile:', error)
    throw error
  }
}
