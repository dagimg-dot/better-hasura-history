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
  static useRootFieldAsFallbackName = false

  static addEntry(input: EntryInput): HistoryItem | null {
    try {
      if (this.isDuplicate(input.query, input.variables, input.operationType)) {
        logger.info('Skipping duplicate entry')
        return null
      }

      let name = input.operationName
      if (
        (!name || name.startsWith('Unnamed')) &&
        this.useRootFieldAsFallbackName &&
        input.operationType !== 'sql'
      ) {
        name = this.extractRootField(input.query) || 'Unnamed'
      }

      const uniqueName = this.generateUniqueName(name)

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

  private static extractRootField(query: string): string | null {
    const trimmed = query.trim()
    if (!trimmed) return null
    const withoutPreamble = trimmed.replace(
      /^\s*(?:query|mutation|subscription)\s+(?:\w+\s*)?(?:\([^)]*\)\s*)?/,
      '',
    )
    const withoutDirectives = withoutPreamble.replace(/@\w+(?:\s*\([^)]*\))?\s*/g, '')
    const rootMatch = withoutDirectives.match(/^\s*\{?\s*(\w+)/)
    return rootMatch ? rootMatch[1] : null
  }

  static recomputeUnnamedEntries(): number {
    let count = 0
    const unnamed = historyItems.value.filter(
      (item) => !item.operationName || item.operationName.startsWith('Unnamed'),
    )
    for (const item of unnamed) {
      const rootField = this.extractRootField(item.query)
      if (rootField) {
        const newName = this.generateUniqueName(rootField)
        updateHistoryItem(item.id, { operationName: newName })
        count++
      }
    }
    return count
  }
}
