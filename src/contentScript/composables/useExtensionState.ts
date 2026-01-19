import { computed, ref } from 'vue'
import { logger } from '@/shared/logging'
import type { DOMElements, ExtensionState } from '@/shared/types'

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
    get: () => state.value.isActive,
    set: (val) => {
      state.value.isActive = val
    },
  })

  const activate = () => {
    try {
      state.value.isActive = true
      logger.info('Extension activated')
    } catch (error) {
      logger.error('Failed to activate extension', error as Error)
    }
  }

  const deactivate = () => {
    try {
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
