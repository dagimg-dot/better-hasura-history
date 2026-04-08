import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { logger } from '@/shared/logging'
import type { HistoryItem } from '@/shared/types/history'
import type { PageType } from '../services/NavigationManager'

const items = useStorage<HistoryItem[]>('better-hasura-history-items', [], undefined, {
  shallow: true,
})
const isLoading = ref(false)
const searchQuery = ref('')
const selectedOperationType = ref<
  'query' | 'mutation' | 'subscription' | 'sql' | 'graphql' | 'all'
>('all')

export function useHistory() {
  const filteredItems = computed(() => {
    let filtered = items.value

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.query.toLowerCase().includes(query) ||
          item.operationName?.toLowerCase().includes(query),
      )
    }

    if (selectedOperationType.value === 'graphql') {
      filtered = filtered.filter((item) => item.operationType !== 'sql')
    } else if (selectedOperationType.value !== 'all') {
      filtered = filtered.filter((item) => item.operationType === selectedOperationType.value)
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp)
  })

  const setPageFilter = (pageType: PageType) => {
    if (pageType === 'sql') {
      selectedOperationType.value = 'sql'
    } else if (pageType === 'graphiql') {
      selectedOperationType.value = 'graphql'
    } else {
      selectedOperationType.value = 'all'
    }
  }

  const filterByType = (
    type: 'query' | 'mutation' | 'subscription' | 'sql' | 'graphql',
  ): HistoryItem[] => {
    if (type === 'graphql')
      return filteredItems.value.filter((item) => item.operationType !== 'sql')
    return filteredItems.value.filter((item) => item.operationType === type)
  }

  const determineOperationType = (query: string): 'query' | 'mutation' | 'subscription' => {
    const trimmed = query.trim().toLowerCase()
    if (trimmed.startsWith('mutation')) return 'mutation'
    if (trimmed.startsWith('subscription')) return 'subscription'
    return 'query'
  }

  const migrateLegacyEntry = (entry: any): HistoryItem | null => {
    if (entry.operation_name && typeof entry.operation_name === 'string') {
      let variables = {}
      if (typeof entry.variables === 'string') {
        try {
          variables = JSON.parse(entry.variables)
        } catch (e) {
          logger.warn('Failed to parse legacy variables', { error: e })
        }
      } else if (typeof entry.variables === 'object') {
        variables = entry.variables
      }

      return {
        id: entry.id || crypto.randomUUID(),
        operationName: entry.operation_name,
        variables: variables as Record<string, any>,
        query: entry.operation || '',
        timestamp: entry.createdAt ? new Date(entry.createdAt).getTime() : Date.now(),
        operationType: determineOperationType(entry.operation || ''),
      }
    }

    if (entry.operationName && entry.query) {
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
      const newItems = [...items.value]
      data.forEach((entry) => {
        const migrated = migrateLegacyEntry(entry)
        if (migrated) {
          const isDuplicate = newItems.some((existing) => existing.id === migrated.id)
          if (!isDuplicate) {
            const isContentDuplicate = newItems.some(
              (existing) =>
                existing.operationName === migrated.operationName &&
                existing.query === migrated.query,
            )
            if (!isContentDuplicate) {
              newItems.unshift(migrated)
              importedCount++
            }
          }
        }
      })
      if (importedCount > 0) items.value = newItems
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
        createdAt: item.timestamp
          ? new Date(item.timestamp).toISOString()
          : new Date().toISOString(),
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
        const newItems = [...items.value]
        newItems[existingIndex] = item
        items.value = newItems
      } else {
        items.value = [item, ...items.value]
      }
    } catch (error) {
      logger.error('Failed to add history item', error as Error, { itemId: item.id })
    }
  }

  const removeHistoryItem = (id: string) => {
    try {
      items.value = items.value.filter((item) => item.id !== id)
    } catch (error) {
      logger.error('Failed to remove history item', error as Error, { itemId: id })
    }
  }

  const updateHistoryItem = (id: string, updates: Partial<HistoryItem>) => {
    try {
      items.value = items.value.map((item) => (item.id === id ? { ...item, ...updates } : item))
    } catch (error) {
      logger.error('Failed to update history item', error as Error, { itemId: id })
    }
  }

  const clearHistory = () => {
    try {
      items.value = []
    } catch (error) {
      logger.error('Failed to clear history', error as Error)
    }
  }

  const loadHistory = async () => {
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
    setPageFilter,
    filterByType,
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
