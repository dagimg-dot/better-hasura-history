import { history } from '../state'
import type { HistoryEntry, ParsedQuery } from '../types'
import { logger } from '../utils/logger'

/**
 * Service for managing history entries business logic.
 * Handles creation, validation, and duplicate detection of history entries.
 */
export class HistoryService {
  /**
   * Create a new history entry from parsed query data.
   * @param parsed - The parsed query data
   * @returns The created history entry
   * @throws Error if the entry is a duplicate or invalid
   */
  static createEntry(parsed: ParsedQuery): HistoryEntry {
    if (!parsed.operation_name || !parsed.operation) {
      throw new Error('Invalid parsed query: missing required fields')
    }

    const { operation_name, operation, variables } = parsed

    if (HistoryService.isDuplicate(operation, variables)) {
      throw new Error('Duplicate entry')
    }

    const uniqueName = HistoryService.generateUniqueName(operation_name)

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      operation_name: uniqueName,
      operation,
      variables: variables || '',
      createdAt: new Date().toISOString(),
    }

    logger.info(`Created new history entry: ${entry.operation_name}`)
    return entry
  }

  /**
   * Add a new entry to the history.
   * @param parsed - The parsed query data
   * @returns The created entry or null if it's a duplicate
   */
  static addEntry(parsed: ParsedQuery): HistoryEntry | null {
    try {
      const entry = HistoryService.createEntry(parsed)
      history.value.unshift(entry)
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
  private static isDuplicate(operation: string, variables?: string): boolean {
    const normalizedVariables = variables || ''
    return history.value.some(
      (entry) => entry.operation === operation && (entry.variables || '') === normalizedVariables,
    )
  }

  /**
   * Generate a unique name based on existing entries.
   */
  private static generateUniqueName(baseName: string): string {
    const relatedEntries = HistoryService.getRelatedEntries(baseName)
    const existingNames = new Set(relatedEntries.map((entry) => entry.operation_name))

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
  private static getRelatedEntries(baseName: string): HistoryEntry[] {
    return history.value.filter(
      (entry) =>
        entry.operation_name === baseName || entry.operation_name.startsWith(`${baseName}_`),
    )
  }

  /**
   * Remove an entry from history by ID.
   */
  static removeEntry(id: string): boolean {
    const initialLength = history.value.length
    history.value = history.value.filter((entry) => entry.id !== id)
    const removed = history.value.length < initialLength

    if (removed) {
      logger.info(`Removed history entry with ID: ${id}`)
    }

    return removed
  }

  /**
   * Clear all history entries.
   */
  static clearHistory(): void {
    const count = history.value.length
    history.value = []
    logger.info(`Cleared ${count} history entries`)
  }

  /**
   * Get history entries count.
   */
  static getCount(): number {
    return history.value.length
  }

  /**
   * Update an existing entry's operation name.
   */
  static updateEntryName(id: string, newName: string): boolean {
    if (!newName.trim()) {
      throw new Error('Entry name cannot be empty')
    }

    const entry = history.value.find((e) => e.id === id)
    if (!entry) {
      return false
    }

    const oldName = entry.operation_name
    entry.operation_name = newName.trim()
    logger.info(`Updated entry name from "${oldName}" to "${newName}"`)

    return true
  }
}
