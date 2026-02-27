import { computed, ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { logger } from '@/shared/logging'
import type { DOMElements, ExtensionState } from '@/shared/types'

const isPaneOpenStorage = useStorage<boolean>('better-hasura-history-pane-open', false)

const state = ref<ExtensionState>({
  isActive: isPaneOpenStorage.value,
  isInitialized: false,
  currentUrl: window.location.href,
  settings: {
    maxHistoryItems: 100,
    autoSave: true,
    showTimestamps: true,
    theme: 'auto',
  },
})

watch(isPaneOpenStorage, (val) => {
  state.value.isActive = val
})

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

  const isPaneOpen = computed({
    get: () => isPaneOpenStorage.value,
    set: (val) => {
      isPaneOpenStorage.value = val
    },
  })

  const activate = () => {
    try {
      isPaneOpenStorage.value = true
      state.value.isActive = true
      logger.info('Extension activated')
    } catch (error) {
      logger.error('Failed to activate extension', error as Error)
    }
  }

  const deactivate = () => {
    try {
      isPaneOpenStorage.value = false
      state.value.isActive = false
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
  }
}
