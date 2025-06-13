import type { QueueKeys } from '@/utils/redis-queue'

import type { RecentDiff, RecentFile } from './files'

// Map your routes to message types
export interface RouteMessageMap {
  '/api/notes/diffs/summarize': {
    diff: RecentDiff
    keys: QueueKeys
  }
  '/api/notes/summarize': {
    keys: QueueKeys
    note: RecentFile
  }

  '/api/summarize/daily': QueueKeys

  '/api/summarize/urls/scrape': {
    keys: QueueKeys
    url: string
  }
  '/api/summarize/weekly': { weekEndDate: string; weekStartDate: string; }
}

// Your UpstashRoute type remains the same
export type UpstashRoute = keyof RouteMessageMap
