import { z } from 'zod'

import { openai } from './ai'
import { redis } from './redis'
import { scrapeUrl } from './scrape'

const urlResponse = z.object({
  summary: z.string(),
  skipUrl: z.boolean(),
})

export async function processUrl(url: string, urlBodiesKey: string) {
  try {
    const body = await scrapeUrl(url) // Replace with your scraping function
    if (body?.body) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You are tasked with summarizing the content of a website based on its title and body. Your goal is to create a concise yet informative summary that captures the main points of the content.

Here is the content to summarize:

<title>${body?.title}</title>

<body>${body?.body}</body>

First, determine if this URL should be skipped. Skip the URL if it's a sign-in page, an authentication page, or any page that doesn't contain substantial content of interest. For example, an Airtable sign-in page should be skipped.

Then, if the URL is not skipped, create a summary of the above content following these guidelines:
- The summary should be detailed but not exhaustive
- Aim for no more than two paragraphs
- Focus on the most important information and key points
- Ensure the summary is coherent and flows well
- Use your best judgment to determine what information is most relevant

Provide your response as a JSON object with the following structure:
{
  "summary": string,  // The summary of the content, or an empty string if skipped
  "skipUrl": boolean  // true if the URL should be skipped, false otherwise
}

Do not include any explanation or additional text outside of this JSON object.`,
          },
        ],
        response_format: { type: 'json_object' },
      })
      if (!response) {
        console.error(`Failed to summarize URL: ${url}`)
        throw new Error('Failed to summarize URL')
      }
      const urlSummary = urlResponse.parse(
        JSON.parse(response.choices[0].message.content ?? ''),
      )
      if (!urlSummary.skipUrl) {
        await redis.hset(urlBodiesKey, {
          [url.trim() as string]: {
            ...body,
            summary: urlSummary.summary.trim(),
          },
        })
        await redis.expire(urlBodiesKey, 86400) // Set TTL for 24 hours
      }
    }
  } catch (error) {
    // Handle failed scrape attempt
    console.error(`Failed to scrape URL: ${url}`)
    // URL is already removed from the list by lpop, no need to handle further
  }
}
