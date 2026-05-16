import {
  historyItems,
  addHistoryItem,
  removeHistoryItem,
  clearHistory,
  updateHistoryItem,
} from '@/shared/storage/historyStorage'
import type { HistoryItem } from '@/shared/types/history'
import { logger } from '@/contentScript/utils/logger'

export interface EntryInput {
  operationName: string
  query: string
  variables?: Record<string, any>
  operationType: 'query' | 'mutation' | 'subscription' | 'sql'
}

export class HistoryService {
  static addEntry(input: EntryInput): HistoryItem | null {
    try {
      if (this.isDuplicate(input.query, input.variables, input.operationType)) {
        logger.info('Skipping duplicate entry')
        return null
      }

      const uniqueName = this.generateUniqueName(input.operationName)

      const entry: HistoryItem = {
        id: crypto.randomUUID(),
        operationName: uniqueName,
        query: input.query,
        variables: input.variables,
        operationType: input.operationType,
        timestamp: Date.now(),
      }

      addHistoryItem(entry)
      logger.info(`Created history entry: ${entry.operationName}`)
      return entry
    } catch (error) {
      logger.error('Failed to create history entry', error as Error)
      return null
    }
  }

  static removeEntry(id: string): boolean {
    const initialLength = historyItems.value.length
    removeHistoryItem(id)
    return historyItems.value.length < initialLength
  }

  static clearHistory(): void {
    const count = historyItems.value.length
    clearHistory()
    logger.info(`Cleared ${count} entries`)
  }

  static updateEntryName(id: string, newName: string): boolean {
    const entry = historyItems.value.find((e) => e.id === id)
    if (!entry) return false
    updateHistoryItem(id, { operationName: newName.trim() })
    return true
  }

  private static isDuplicate(
    query: string,
    variables?: Record<string, any>,
    operationType?: string,
  ): boolean {
    return historyItems.value.some((entry) => {
      if (entry.query !== query) return false
      if (entry.operationType === 'sql') return entry.operationType === operationType
      return JSON.stringify(entry.variables || {}) === JSON.stringify(variables || {})
    })
  }

  private static generateUniqueName(baseName: string): string {
    const related = historyItems.value.filter(
      (e) => e.operationName === baseName || e.operationName?.startsWith(`${baseName}_`),
    )
    const existingNames = new Set(related.map((e) => e.operationName))

    if (!existingNames.has(baseName)) return baseName

    let suffix = 1
    while (existingNames.has(`${baseName}_${suffix}`)) {
      suffix++
    }
    return `${baseName}_${suffix}`
  }
}
