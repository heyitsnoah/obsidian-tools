import { TextBlock } from '@anthropic-ai/sdk/resources/messages.mjs'
import dayjs from 'dayjs'
import timezonePlugin from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { NextRequest } from 'next/server'

import {
  getWeeklySummarySystemPrompt,
  WeeklySummaryFormat,
} from '@/prompts/summarize/weekly-summary-user'
import { RouteMessageMap } from '@/types/upstash'
import { anthropic, extractJson } from '@/utils/ai'
import { createOrUpdateFile, getDailySummaries } from '@/utils/github'
import { publishToUpstash, verifyUpstashSignature } from '@/utils/upstash'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
dayjs.extend(utc)
dayjs.extend(timezonePlugin)

const dayToNumber = (day: string): number => {
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  return days.indexOf(day.toLowerCase())
}

export async function POST(req: NextRequest) {
  const body: RouteMessageMap['/api/summarize/weekly'] =
    await verifyUpstashSignature(req)
  // Add your weekly summary logic here
  const dailySummaries = await getDailySummaries(
    process.env.GITHUB_USERNAME!,
    process.env.GITHUB_REPO!,
  )

  const response = await anthropic.messages.create({
    max_tokens: 4000,
    model: 'claude-3-5-sonnet-20240620',
    messages: [
      {
        role: 'user',
        content: getWeeklySummarySystemPrompt({
          dailySummaries,
          weekEndDate: body.weekEndDate,
          weekStartDate: body.weekStartDate,
        }),
      },
    ],
  })
  const responseText = (response.content[0] as TextBlock).text
  const parsed = await (async () => {
    try {
      return WeeklySummaryFormat.parse(JSON.parse(responseText))
    } catch (error) {
      console.error('Error parsing response:', error)
      console.log('Response:', responseText)
      return await extractJson(responseText, WeeklySummaryFormat)
    }
  })()
  const responseContent = `# Weekly Summary for ${body.weekStartDate} - ${body.weekEndDate}\n## Overall Summary\n${parsed.executiveSummary}\n## Strategic Implications\n- ${parsed.strategicInsights.join('\n- ')}\n## Challenges & Opportunities\n### Challenges\n- ${parsed.challengesAndOpportunities.challenges.join('\n- ')}\n### Opportunities\n- ${parsed.challengesAndOpportunities.opportunities.join('\n- ')}\n## Key Developments & Trends\n- ${parsed.keyDevelopmentsAndTrends.join('\n- ')}\n## Long Term Implications\n- ${parsed.longTermImplications.join('\n- ')}\n## Goals for Next Week\n- ${parsed.goalsForNextWeek.join('\n- ')}`
  const filename = `${process.env.WEEKLY_SUMMARY_NAME} ${dayjs().format('YYYY-MM-DD')}${process.env.NODE_ENV === 'development' ? `-DEV` : ''}.md`

  await createOrUpdateFile({
    filename,
    content: responseContent,
    path: process.env.WEEKLY_SUMMARY_FOLDER,
    inbox: true,
  })
  console.log('Weekly summary written to GitHub: ', filename)
  return new Response('ok', { status: 200 })
}

export async function GET(req: NextRequest) {
  if (
    req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV !== 'development'
  ) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!process.env.YOUR_NAME || !process.env.OPENAI_API_KEY) {
    // Treating this as if user does not want weekly summaries.
    return new Response('Missing environment variables', { status: 200 })
  }
  const timezone = process.env.TIMEZONE || 'America/New_York'
  const weeklySummaryDay = process.env.WEEKLY_SUMMARY_DAY || 'Sunday'
  const weeklySummaryTime = process.env.WEEKLY_SUMMARY_TIME || '09:00'

  const now = dayjs().tz(timezone).second(0)
  console.log('Current time:', now.format('YYYY-MM-DD dddd HH:mm:ss'))

  const dayNumber = dayToNumber(weeklySummaryDay)
  if (dayNumber === -1) {
    console.error('Invalid day specified:', weeklySummaryDay)
    return new Response('Invalid day specified', { status: 400 })
  }

  const [hour, minute] = weeklySummaryTime.split(':').map(Number)
  if (isNaN(hour) || isNaN(minute)) {
    console.error('Invalid time format:', weeklySummaryTime)
    return new Response('Invalid time format', { status: 400 })
  }

  // Create scheduledTime based on the current date
  let scheduledTime = now.day(dayNumber).hour(hour).minute(minute).second(0)

  // If scheduledTime is in the past, move it to next week
  if (scheduledTime.isBefore(now)) {
    scheduledTime = scheduledTime.add(1, 'week')
  }

  console.log(
    'Scheduled time:',
    scheduledTime.format('YYYY-MM-DD dddd HH:mm:ss'),
  )

  // Compare the current time with the scheduled time, ignoring seconds
  const isScheduledTime =
    now.isSame(scheduledTime, 'day') &&
    now.isSame(scheduledTime, 'hour') &&
    now.isSame(scheduledTime, 'minute')

  if (!isScheduledTime) {
    console.log('Not scheduled time')
    return new Response('Not scheduled time', { status: 200 })
  }

  console.log('Running weekly summary')
  const weekStartDate = scheduledTime.subtract(6, 'days').format('MMMM D, YYYY')
  const weekEndDate = scheduledTime.format('MMMM D, YYYY')
  await publishToUpstash('/api/summarize/weekly', {
    weekEndDate,
    weekStartDate,
  })
  return new Response('Weekly summary executed', { status: 200 })
}
