import { computed, type Ref, ref } from 'vue'
import { logger } from '@/shared/logging'
import type { HistoryItem, HistorySearchOptions } from '@/shared/types'

// Singleton state
const items: Ref<HistoryItem[]> = ref([])
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
    isLoading.value = true
    try {
      // This would typically load from storage
      // For now, we'll just simulate loading
      await new Promise((resolve) => setTimeout(resolve, 100))
      logger.debug('History loaded', { itemCount: items.value.length })
    } catch (error) {
      logger.error('Failed to load history', error as Error)
    } finally {
      isLoading.value = false
    }
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
  }
}
