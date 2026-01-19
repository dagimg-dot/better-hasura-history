import { computed, type Ref, ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { logger } from '@/shared/logging'
import type { HistoryItem, HistorySearchOptions } from '@/shared/types'

// Singleton state
const items = useStorage<HistoryItem[]>('better-hasura-history-items', [])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedOperationType = ref<'query' | 'mutation' | 'subscription' | 'all'>('all')

export function useHistory() {
  const filteredItems = computed(() => {
    let filtered = items.value

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.query.toLowerCase().includes(query) ||
          item.operationName?.toLowerCase().includes(query),
      )
    }

    // Filter by operation type
    if (selectedOperationType.value !== 'all') {
      filtered = filtered.filter((item) => item.operationType === selectedOperationType.value)
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  })

  // Helper to determine operation type from query string
  const determineOperationType = (query: string): 'query' | 'mutation' | 'subscription' => {
    const trimmed = query.trim().toLowerCase()
    if (trimmed.startsWith('mutation')) return 'mutation'
    if (trimmed.startsWith('subscription')) return 'subscription'
    return 'query'
  }

  // Helper to migrate legacy entries
  const migrateLegacyEntry = (entry: any): HistoryItem | null => {
    // Check if it's a legacy entry
    if (entry.operation_name && typeof entry.operation_name === 'string') {
      let variables = {}
      if (typeof entry.variables === 'string') {
        try {
          variables = JSON.parse(entry.variables) as Record<string, any>
        } catch (e) {
          logger.warn('Failed to parse legacy variables', { error: e })
        }
      } else if (typeof entry.variables === 'object') {
        variables = entry.variables
      }

      const query = entry.operation || ''
      return {
        id: entry.id || crypto.randomUUID(),
        operationName: entry.operation_name,
        variables: variables as Record<string, any>,
        query,
        timestamp: entry.createdAt ? new Date(entry.createdAt).getTime() : Date.now(),
        operationType: determineOperationType(query),
      }
    }
    // If it's already a valid format but maybe missing new fields
    if (entry.operationName && entry.query) {
      // Ensure operationType is set if missing
      if (!entry.operationType) {
        entry.operationType = determineOperationType(entry.query)
      }
      return entry as HistoryItem
    }
    return null
  }

  const importHistory = (data: any[]) => {
    let importedCount = 0
    try {
      data.forEach((entry) => {
        const migrated = migrateLegacyEntry(entry)
        if (migrated) {
          // Check for duplicates
          const isDuplicate = items.value.some((existing) => existing.id === migrated.id)
          if (!isDuplicate) {
            // Also check for duplicate content (same name/query) to avoid clutter
            const isContentDuplicate = items.value.some(
              (existing) =>
                existing.operationName === migrated.operationName &&
                existing.query === migrated.query,
            )

            if (!isContentDuplicate) {
              items.value.unshift(migrated)
              importedCount++
            }
          }
        }
      })
      logger.info(`Imported ${importedCount} history items`)
    } catch (error) {
      logger.error('Failed to import history', error as Error)
    }
    return importedCount
  }

  const exportHistory = (): string => {
    try {
      const data = items.value.map((item) => ({
        id: item.id,
        operationName: item.operationName,
        query: item.query,
        variables: item.variables,
        operationType: item.operationType,
        createdAt: new Date(item.timestamp).toISOString(),
      }))
      return JSON.stringify(data, null, 2)
    } catch (error) {
      logger.error('Failed to export history', error as Error)
      return ''
    }
  }

  const addHistoryItem = (item: HistoryItem) => {
    try {
      const existingIndex = items.value.findIndex((existing) => existing.id === item.id)

      if (existingIndex >= 0) {
        items.value[existingIndex] = item
      } else {
        items.value.unshift(item)
      }

      logger.debug('History item added', { itemId: item.id })
    } catch (error) {
      logger.error('Failed to add history item', error as Error, {
        itemId: item.id,
      })
    }
  }

  const removeHistoryItem = (id: string) => {
    try {
      const index = items.value.findIndex((item) => item.id === id)
      if (index >= 0) {
        items.value.splice(index, 1)
        logger.debug('History item removed', { itemId: id })
      }
    } catch (error) {
      logger.error('Failed to remove history item', error as Error, {
        itemId: id,
      })
    }
  }

  const updateHistoryItem = (id: string, updates: Partial<HistoryItem>) => {
    try {
      const item = items.value.find((i) => i.id === id)
      if (item) {
        Object.assign(item, updates)
        logger.debug('History item updated', { itemId: id })
      }
    } catch (error) {
      logger.error('Failed to update history item', error as Error, {
        itemId: id,
      })
    }
  }

  const clearHistory = () => {
    try {
      items.value = []
      logger.info('History cleared')
    } catch (error) {
      logger.error('Failed to clear history', error as Error)
    }
  }

  const loadHistory = async () => {
    // With useStorage, we don't need manual loading, but we can keep this for interface compatibility
    isLoading.value = true
    await new Promise((r) => setTimeout(r, 50))
    isLoading.value = false
  }

  return {
    items: computed(() => items.value),
    filteredItems,
    isLoading: computed(() => isLoading.value),
    searchQuery,
    selectedOperationType,
    addHistoryItem,
    removeHistoryItem,
    clearHistory,
    loadHistory,
    updateHistoryItem,
    importHistory,
    exportHistory,
    determineOperationType,
  }
}
