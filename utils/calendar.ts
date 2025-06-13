import { type calendar_v3, google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
})

export const calendar = google.calendar({ auth, version: 'v3' })

export async function formatCalendarEvents(
  events: calendar_v3.Schema$Event[],
): Promise<string> {
  const calendarResponse = await calendar.calendars.get({
    calendarId: process.env.CALENDAR_NAME,
  })

  const calendarTimezone = calendarResponse.data.timeZone || 'UTC'

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
        dateString = `Start: ${startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', timeZone: calendarTimezone, year: 'numeric' })} (All day)\n  - End: ${endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', timeZone: calendarTimezone, year: 'numeric' })} (All day)`
      } else {
        dateString = `Date: ${startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', timeZone: calendarTimezone, year: 'numeric' })}\n  - Time: ${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: calendarTimezone })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: calendarTimezone })} (${event.start?.timeZone || calendarTimezone})`
      }

      return `- **${event.summary || 'Untitled Event'}**
  - ${dateString}
`
    })
    .join('\n')
}

export async function getDaysEvents(): Promise<calendar_v3.Schema$Event[]> {
  const calendarResponse = await calendar.calendars.get({
    calendarId: process.env.CALENDAR_NAME,
  })

  const calendarTimezone = calendarResponse.data.timeZone || 'UTC'
  const now = new Date()
  const startOfDay = new Date(
    now.toLocaleString('en-US', { timeZone: calendarTimezone }),
  )
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  const response = await calendar.events.list({
    calendarId: process.env.CALENDAR_NAME,
    fields:
      'items(id,summary,description,location,start,end,attendees,organizer,visibility,status,created,updated)',
    orderBy: 'startTime',
    singleEvents: true,
    timeMax: endOfDay.toISOString(),
    timeMin: startOfDay.toISOString(),
    timeZone: calendarTimezone,
  })

  return (
    response.data.items?.filter((event) => event.status === 'confirmed') || []
  )
}
