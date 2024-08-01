import { QueueKeys } from '@/utils/redis-queue'

import { RecentDiff, RecentFile } from './files'

// Map your routes to message types
export type RouteMessageMap = {
  '/api/summarize/urls/scrape': {
    url: string
    keys: QueueKeys
  }
  '/api/notes/summarize': {
    note: RecentFile
    keys: QueueKeys
  }

  '/api/notes/diffs/summarize': {
    diff: RecentDiff
    keys: QueueKeys
  }

  '/api/summarize/daily': string
}

// Your UpstashRoute type remains the same
export type UpstashRoute = keyof RouteMessageMap
