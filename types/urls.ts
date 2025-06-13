export type UrlBodies = Record<string, UrlSummary>

export interface UrlSummary {
  body: string
  metadata: Metadata[]
  summary?: string
  title: string
}

interface Metadata {
  key: string
  value: string
}
