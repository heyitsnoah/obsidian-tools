import { calendar_v3, google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
})

export const calendar = google.calendar({ version: 'v3', auth })

export async function getDaysEvents() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  )

  const response = await calendar.events.list({
    calendarId: process.env.CALENDAR_NAME,
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    fields:
      'items(id,summary,description,location,start,end,attendees,organizer,visibility,status,created,updated)',
  })

  const events = []
  if (response.data.items) {
    for (const event of response.data.items) {
      if (event.status === 'confirmed') {
        events.push(event)
      }
    }
  }
  return events
}

export function formatCalendarEvents(events: calendar_v3.Schema$Event[]) {
  return events
    .filter(
      (event): event is calendar_v3.Schema$Event =>
        !!event &&
        !!event.start &&
        (!!event.start.date || !!event.start.dateTime),
    )
    .map((event) => {
      const isAllDay = !!event.start?.date
      const startDate = new Date(
        isAllDay ? event.start?.date || '' : event.start?.dateTime || '',
      )
      const endDate = new Date(
        isAllDay ? event.end?.date || '' : event.end?.dateTime || '',
      )

      let dateString: string
      if (isAllDay) {
        dateString = `Start: ${startDate.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' })} (All day)\n  - End: ${endDate.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' })} (All day)`
      } else {
        dateString = `Date: ${startDate.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' })}\n  - Time: ${startDate.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })} (${event.start?.timeZone || 'Unknown'})`
      }

      return `- **${event.summary || 'Untitled Event'}**
  - ${dateString}
  - Organizer: ${event.organizer?.displayName || 'Unknown'}
`
    })
    .join('\n')
}
