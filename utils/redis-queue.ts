// Generic type for the item to be processed
export type QueueItem<T> = T

// Generic type for the processed result
export interface ProcessedResult<R> {
  result: null | R
  skipItem: boolean
}

export interface QueueKeys {
  date: string
  notesKey: string
  queueKey: string
  urlsKey: string
}

export function getQueueKeys(queueName: string): QueueKeys {
  const date = new Date().toISOString().split('T')[0]
  const queueKey = `${queueName}_queue_${date}`
  const notesKey = `${queueName}_notes_${date}`
  const urlsKey = `${queueName}_urls_${date}`
  return { date, notesKey, queueKey, urlsKey }
}
