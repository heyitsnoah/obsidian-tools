type Metadata = {
  key: string
  value: string
}

export type UrlSummary = {
  title: string
  body: string
  metadata: Metadata[]
  summary?: string
}

export type UrlBodies = Record<string, UrlSummary>
