import { useHistory } from '@/contentScript/composables/useHistory'
import type { HistoryItem } from '@/shared/types/history'
import type { ParsedQuery } from '@/contentScript/types'
import { logger } from '@/contentScript/utils/logger'

/**
 * Service for managing history entries business logic.
 * Handles creation, validation, and duplicate detection of history entries.
 */
export class HistoryService {
  /**
   * Create a new history entry from parsed query data.
   */
  static createEntry(parsed: ParsedQuery): HistoryItem {
    if (!parsed.operation_name || !parsed.operation) {
      throw new Error('Invalid parsed query: missing required fields')
    }

    const { operation_name, operation, variables } = parsed

    let parsedVariables: Record<string, any> = {}
    if (variables) {
      try {
        parsedVariables = JSON.parse(variables)
      } catch (e) {
        logger.warn('Failed to parse variables JSON', e)
        parsedVariables = {}
      }
    }

    if (HistoryService.isDuplicate(operation, parsedVariables)) {
      throw new Error('Duplicate entry')
    }

    const uniqueName = HistoryService.generateUniqueName(operation_name)

    const entry: HistoryItem = {
      id: crypto.randomUUID(),
      operationName: uniqueName, // Mapped from operation_name
      variables: parsedVariables,
      timestamp: Date.now(),
      query: operation, // Use operation as query string
      operationType: 'query', // Default or parsed? ParsedQuery usually has types? Assuming query for now or we need to extract it.
    }

    logger.info(`Created new history entry: ${entry.operationName}`)
    return entry
  }

  /**
   * Add a new entry to the history.
   */
  static addEntry(parsed: ParsedQuery): HistoryItem | null {
    const { addHistoryItem } = useHistory()
    try {
      const entry = HistoryService.createEntry(parsed)
      addHistoryItem(entry)
      return entry
    } catch (error) {
      if (error instanceof Error && error.message === 'Duplicate entry') {
        logger.info('Skipping duplicate history entry')
        return null
      }
      logger.error('Failed to create history entry', error)
      throw error
    }
  }

  /**
   * Check if an entry with the same operation and variables already exists.
   */
  private static isDuplicate(operation: string, variables?: Record<string, any>): boolean {
    const { items } = useHistory()
    const normalizedVariables = JSON.stringify(variables || {})
    return items.value.some(
      (entry) =>
        entry.query === operation && JSON.stringify(entry.variables || {}) === normalizedVariables,
    )
  }

  /**
   * Generate a unique name based on existing entries.
   */
  private static generateUniqueName(baseName: string): string {
    const relatedEntries = HistoryService.getRelatedEntries(baseName)
    const existingNames = new Set(relatedEntries.map((entry) => entry.operationName))

    if (!existingNames.has(baseName)) {
      return baseName
    }

    // Find the next available suffix
    let suffix = 1
    while (existingNames.has(`${baseName}_${suffix}`)) {
      suffix++
    }

    return `${baseName}_${suffix}`
  }

  /**
   * Get all entries related to a base operation name.
   */
  private static getRelatedEntries(baseName: string): HistoryItem[] {
    const { items } = useHistory()
    return items.value.filter(
      (entry) =>
        entry.operationName === baseName ||
        (entry.operationName && entry.operationName.startsWith(`${baseName}_`)),
    )
  }

  /**
   * Remove an entry from history by ID.
   */
  static removeEntry(id: string): boolean {
    const { removeHistoryItem, items } = useHistory()
    const initialLength = items.value.length
    removeHistoryItem(id)
    const removed = items.value.length < initialLength

    if (removed) {
      logger.info(`Removed history entry with ID: ${id}`)
    }

    return removed
  }

  /**
   * Clear all history entries.
   */
  static clearHistory(): void {
    const { clearHistory, items } = useHistory()
    const count = items.value.length
    clearHistory()
    logger.info(`Cleared ${count} history entries`)
  }

  /**
   * Get history entries count.
   */
  static getCount(): number {
    const { items } = useHistory()
    return items.value.length
  }

  /**
   * Update an existing entry's operation name.
   */
  static updateEntryName(id: string, newName: string): boolean {
    if (!newName.trim()) {
      throw new Error('Entry name cannot be empty')
    }

    const { updateHistoryItem, items } = useHistory()
    const entry = items.value.find((e) => e.id === id)
    if (!entry) {
      return false
    }

    const oldName = entry.operationName
    updateHistoryItem(id, { operationName: newName.trim() })
    logger.info(`Updated entry name from "${oldName}" to "${newName}"`)

    return true
  }
}
