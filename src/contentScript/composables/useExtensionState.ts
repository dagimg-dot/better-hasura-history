import { computed, ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import type { PageType } from '../services/NavigationManager'

const isPaneOpenGraphiqlStorage = useStorage<boolean>(
  'better-hasura-history-pane-open-graphiql',
  false,
)
const isPaneOpenSqlStorage = useStorage<boolean>('better-hasura-history-pane-open-sql', false)

const currentPageType = ref<PageType>('unknown')

const isActive = ref(false)
const isInitialized = ref(false)

watch([isPaneOpenGraphiqlStorage, isPaneOpenSqlStorage], () => {
  if (currentPageType.value === 'sql') {
    isActive.value = isPaneOpenSqlStorage.value
  } else {
    isActive.value = isPaneOpenGraphiqlStorage.value
  }
})

export function useExtensionState() {
  const getCurrentStorage = () => {
    return currentPageType.value === 'sql' ? isPaneOpenSqlStorage : isPaneOpenGraphiqlStorage
  }

  const isPaneOpen = computed({
    get() {
      return getCurrentStorage().value
    },
    set(val) {
      getCurrentStorage().value = val
      isActive.value = val
    },
  })

  const setPageType = (type: PageType) => {
    currentPageType.value = type
    isActive.value = type === 'sql' ? isPaneOpenSqlStorage.value : isPaneOpenGraphiqlStorage.value
  }

  const initialize = () => {
    isInitialized.value = true
  }

  const cleanup = () => {
    isActive.value = false
    isInitialized.value = false
  }

  return {
    isActive: computed(() => isActive.value),
    isInitialized: computed(() => isInitialized.value),
    isPaneOpen,
    pageType: computed(() => currentPageType.value),
    setPageType,
    initialize,
    cleanup,
  }
}
