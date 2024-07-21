// Map your routes to message types
export type RouteMessageMap = {
  '/api/summarize/urls/scrape': {
    urlQueueKey: string
    urlProcessedKey: string
    urlBodiesKey: string
  }
}

// Your UpstashRoute type remains the same
export type UpstashRoute = keyof RouteMessageMap
