import { google } from 'googleapis'

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
