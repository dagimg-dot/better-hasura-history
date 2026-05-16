import { computed, ref } from 'vue'
import { OPERATION_TYPES } from '@/shared/constants'
import { logger } from '@/shared/logging'
import type { HistoryItem } from '@/shared/types/history'
import type { PageType } from '@/shared/types/services'
import {
  historyItems,
  addHistoryItem,
  removeHistoryItem,
  updateHistoryItem,
  clearHistory,
} from '@/shared/storage/historyStorage'

const isLoading = ref(false)
const searchQuery = ref('')
const selectedOperationType = ref<
  'query' | 'mutation' | 'subscription' | 'sql' | 'graphql' | 'all'
>('all')

export function useHistory() {
  const filteredItems = computed(() => {
    let filtered = historyItems.value

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
    if (trimmed.startsWith(OPERATION_TYPES.MUTATION)) return OPERATION_TYPES.MUTATION
    if (trimmed.startsWith(OPERATION_TYPES.SUBSCRIPTION)) return OPERATION_TYPES.SUBSCRIPTION
    return OPERATION_TYPES.QUERY
  }

  const migrateLegacyEntry = (entry: unknown): HistoryItem | null => {
    if (typeof entry !== 'object' || entry === null) return null

    const e = entry as Record<string, unknown>

    if (typeof e.operation_name === 'string') {
      let variables: Record<string, any> = {}
      if (typeof e.variables === 'string') {
        try {
          variables = JSON.parse(e.variables)
        } catch (err) {
          logger.warn('Failed to parse legacy variables', { error: err })
        }
      } else if (typeof e.variables === 'object' && e.variables !== null) {
        variables = e.variables as Record<string, any>
      }

      return {
        id: typeof e.id === 'string' ? e.id : crypto.randomUUID(),
        operationName: e.operation_name,
        variables,
        query: typeof e.operation === 'string' ? e.operation : '',
        timestamp: typeof e.createdAt === 'string' ? new Date(e.createdAt).getTime() : Date.now(),
        operationType: determineOperationType(typeof e.operation === 'string' ? e.operation : ''),
      }
    }

    if (typeof e.operationName === 'string' && typeof e.query === 'string') {
      return {
        id: typeof e.id === 'string' ? e.id : crypto.randomUUID(),
        operationName: e.operationName,
        query: e.query,
        variables:
          typeof e.variables === 'object' && e.variables !== null
            ? (e.variables as Record<string, any>)
            : undefined,
        operationType:
          typeof e.operationType === 'string' &&
          ['query', 'mutation', 'subscription', 'sql'].includes(e.operationType)
            ? (e.operationType as HistoryItem['operationType'])
            : determineOperationType(e.query),
        timestamp:
          typeof e.timestamp === 'number'
            ? e.timestamp
            : typeof e.createdAt === 'string'
              ? new Date(e.createdAt).getTime()
              : Date.now(),
      }
    }

    return null
  }

  const importHistory = (data: unknown[], overwriteTimestamps = false) => {
    let importedCount = 0
    try {
      const newItems = [...historyItems.value]
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
            } else if (overwriteTimestamps) {
              const existing = newItems.find(
                (e) => e.operationName === migrated.operationName && e.query === migrated.query,
              )
              if (existing) {
                existing.timestamp = migrated.timestamp
              }
            }
          } else if (overwriteTimestamps) {
            const existing = newItems.find((e) => e.id === migrated.id)
            if (existing) {
              existing.timestamp = migrated.timestamp
            }
          }
        }
      })
      if (importedCount > 0 || overwriteTimestamps) historyItems.value = newItems
    } catch (error) {
      logger.error('Failed to import history', error as Error)
    }
    return importedCount
  }

  const exportHistory = (): string => {
    try {
      const data = historyItems.value.map((item) => ({
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

  const loadHistory = async () => {
    isLoading.value = true
    await new Promise((r) => setTimeout(r, 50))
    isLoading.value = false
  }

  return {
    items: computed(() => historyItems.value),
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
