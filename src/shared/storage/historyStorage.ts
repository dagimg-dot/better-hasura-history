import { useStorage } from '@vueuse/core'
import { logger } from '@/shared/logging'
import type { HistoryItem } from '@/shared/types/history'

export const historyItems = useStorage<HistoryItem[]>(
  'better-hasura-history-items',
  [],
  undefined,
  {
    shallow: true,
  },
)

export function addHistoryItem(item: HistoryItem): void {
  try {
    const existingIndex = historyItems.value.findIndex((existing) => existing.id === item.id)
    if (existingIndex >= 0) {
      const newItems = [...historyItems.value]
      newItems[existingIndex] = item
      historyItems.value = newItems
    } else {
      historyItems.value = [item, ...historyItems.value]
    }
  } catch (error) {
    logger.error('Failed to add history item', error as Error, { itemId: item.id })
  }
}

export function removeHistoryItem(id: string): void {
  try {
    historyItems.value = historyItems.value.filter((item) => item.id !== id)
  } catch (error) {
    logger.error('Failed to remove history item', error as Error, { itemId: id })
  }
}

export function updateHistoryItem(id: string, updates: Partial<HistoryItem>): void {
  try {
    historyItems.value = historyItems.value.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    )
  } catch (error) {
    logger.error('Failed to update history item', error as Error, { itemId: id })
  }
}

export function clearHistory(): void {
  try {
    historyItems.value = []
  } catch (error) {
    logger.error('Failed to clear history', error as Error)
  }
}
