import { redis } from './redis'

// Generic type for the item to be processed
export type QueueItem<T> = T

// Generic type for the processed result
export type ProcessedResult<R> = {
  result: R | null
  skipItem: boolean
}

export type QueueKeys = {
  queueKey: string
  notesKey: string
  urlsKey: string
  processedKey: string
}

export function getQueueKeys(queueName: string): QueueKeys {
  const date = new Date().toISOString().split('T')[0]
  const queueKey = `${queueName}_queue_${date}`
  const notesKey = `${queueName}_notes_${date}`
  const urlsKey = `${queueName}_urls_${date}`
  const processedKey = `${queueName}_processed_${date}`
  return { queueKey, notesKey, urlsKey, processedKey }
}

export async function storeItems<T>(queueKey: string, items: QueueItem<T>[]) {
  await redis.rpush(queueKey, ...items.map((item) => JSON.stringify(item)))
  await redis.expire(queueKey, 86400) // Set TTL for 24 hours
}

export async function isProcessingComplete(
  queueKey: string,
  processedKey: string,
): Promise<boolean> {
  const totalItems = await redis.llen(queueKey)
  const processedItems = await redis.hlen(processedKey)
  return totalItems === 0 && processedItems > 0
}

export async function processItem<T, R>(
  queueKey: string,
  resultsKey: string,
  processedKey: string,
  processorFunction: (item: QueueItem<T>) => Promise<ProcessedResult<R>>,
): Promise<number> {
  const itemString: string | null = await redis.lpop(queueKey)
  if (itemString) {
    const item: QueueItem<T> = JSON.parse(itemString)
    try {
      const processedResult = await processorFunction(item)

      if (!processedResult.skipItem && processedResult.result !== null) {
        await redis.hset(resultsKey, {
          [JSON.stringify(item)]: JSON.stringify(processedResult.result),
        })
        await redis.expire(resultsKey, 86400) // Set TTL for 24 hours
      }
    } catch (error) {
      console.error(`Failed to process item: ${JSON.stringify(item)}`)
    }
    await redis.hset(processedKey, { [JSON.stringify(item)]: 'true' })
    await redis.expire(processedKey, 86400) // Set TTL for 24 hours
  }
  const remainingItems = await redis.llen(queueKey)
  return remainingItems
}
