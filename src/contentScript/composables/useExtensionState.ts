import { computed, ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { logger } from '@/shared/logging'
import type { DOMElements, ExtensionState } from '@/shared/types'
import type { PageType } from '../services/NavigationManager'

// Separate storage keys for each page
const isPaneOpenGraphiqlStorage = useStorage<boolean>(
  'better-hasura-history-pane-open-graphiql',
  false,
)
const isPaneOpenSqlStorage = useStorage<boolean>('better-hasura-history-pane-open-sql', false)

const currentPageType = ref<PageType>('unknown')

const state = ref<ExtensionState>({
  isActive: false,
  isInitialized: false,
  currentUrl: window.location.href,
  settings: {
    maxHistoryItems: 100,
    autoSave: true,
    showTimestamps: true,
    theme: 'auto',
  },
})

watch(
  () => [isPaneOpenGraphiqlStorage.value, isPaneOpenSqlStorage.value],
  () => {
    // Update state.isActive based on current page's pane state
    if (currentPageType.value === 'sql') {
      state.value.isActive = isPaneOpenSqlStorage.value
    } else {
      state.value.isActive = isPaneOpenGraphiqlStorage.value
    }
  },
)

const domElements = ref<DOMElements>({
  buttonContainer: null,
  paneContainer: null,
  targetElement: null,
})

export function useExtensionState() {
  const isReady = computed(
    () =>
      state.value.isInitialized &&
      domElements.value.buttonContainer &&
      domElements.value.paneContainer,
  )

  // Get the appropriate storage key based on current page type
  const getCurrentStorage = () => {
    if (currentPageType.value === 'sql') {
      return isPaneOpenSqlStorage
    }
    return isPaneOpenGraphiqlStorage
  }

  const isPaneOpen = computed({
    get() {
      const storage = getCurrentStorage()
      return storage.value
    },
    set(val) {
      const storage = getCurrentStorage()
      storage.value = val
      state.value.isActive = val
    },
  })

  const pageType = computed(() => currentPageType.value)

  const setPageType = (type: PageType) => {
    currentPageType.value = type
    // Update isActive to reflect current page's state
    if (type === 'sql') {
      state.value.isActive = isPaneOpenSqlStorage.value
    } else {
      state.value.isActive = isPaneOpenGraphiqlStorage.value
    }
    logger.debug(`Page type set to: ${type}`)
  }

  const activate = () => {
    try {
      if (currentPageType.value === 'sql') {
        isPaneOpenSqlStorage.value = true
        state.value.isActive = true
      } else {
        isPaneOpenGraphiqlStorage.value = true
        state.value.isActive = true
      }
      logger.info('Extension activated')
    } catch (error) {
      logger.error('Failed to activate extension', error as Error)
    }
  }

  const deactivate = () => {
    try {
      if (currentPageType.value === 'sql') {
        isPaneOpenSqlStorage.value = false
        state.value.isActive = false
      } else {
        isPaneOpenGraphiqlStorage.value = false
        state.value.isActive = false
      }
      logger.info('Extension deactivated')
    } catch (error) {
      logger.error('Failed to deactivate extension', error as Error)
    }
  }

  const initialize = () => {
    try {
      state.value.isInitialized = true
      state.value.currentUrl = window.location.href
      logger.info('Extension state initialized')
    } catch (error) {
      logger.error('Failed to initialize extension state', error as Error)
    }
  }

  const cleanup = () => {
    try {
      state.value.isActive = false
      state.value.isInitialized = false
      domElements.value = {
        buttonContainer: null,
        paneContainer: null,
        targetElement: null,
      }
      logger.info('Extension state cleaned up')
    } catch (error) {
      logger.error('Failed to cleanup extension state', error as Error)
    }
  }

  const updateDOMElements = (elements: Partial<DOMElements>) => {
    domElements.value = { ...domElements.value, ...elements }
  }

  return {
    state,
    domElements,
    isReady,
    activate,
    deactivate,
    initialize,
    cleanup,
    updateDOMElements,
    isPaneOpen,
    pageType,
    setPageType,
  }
}
