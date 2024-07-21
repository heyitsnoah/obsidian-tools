type Metadata = {
  key: string
  value: string
}

type UrlSummary = {
  title: string
  body: string
  metadata: Metadata[]
  summary?: string
}

export type UrlBodies = Record<string, UrlSummary>
