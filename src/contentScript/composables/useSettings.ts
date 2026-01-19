import { type Ref, ref } from 'vue'
import { EXTENSION_CONFIG } from '@/shared/constants'
import { logger } from '@/shared/logging'
import type { ExtensionSettings } from '@/shared/types'

export function useSettings() {
  const settings: Ref<ExtensionSettings> = ref({
    maxHistoryItems: EXTENSION_CONFIG.DEFAULTS.MAX_HISTORY_ITEMS,
    autoSave: EXTENSION_CONFIG.DEFAULTS.AUTO_SAVE,
    showTimestamps: EXTENSION_CONFIG.DEFAULTS.SHOW_TIMESTAMPS,
    theme: EXTENSION_CONFIG.DEFAULTS.THEME,
  })

  const isLoading = ref(false)

  const loadSettings = async () => {
    isLoading.value = true
    try {
      const result = await chrome.storage.sync.get(EXTENSION_CONFIG.STORAGE_KEYS.SETTINGS)
      if (result[EXTENSION_CONFIG.STORAGE_KEYS.SETTINGS]) {
        settings.value = {
          ...settings.value,
          ...result[EXTENSION_CONFIG.STORAGE_KEYS.SETTINGS],
        }
      }
      logger.debug('Settings loaded', { settings: settings.value })
    } catch (error) {
      logger.error('Failed to load settings', error as Error)
    } finally {
      isLoading.value = false
    }
  }

  const updateSettings = async (newSettings: Partial<ExtensionSettings>) => {
    try {
      settings.value = { ...settings.value, ...newSettings }
      await chrome.storage.sync.set({
        [EXTENSION_CONFIG.STORAGE_KEYS.SETTINGS]: settings.value,
      })
      logger.debug('Settings updated', { newSettings })
    } catch (error) {
      logger.error('Failed to update settings', error as Error, {
        newSettings,
      })
      throw error
    }
  }

  const resetSettings = async () => {
    try {
      settings.value = {
        maxHistoryItems: EXTENSION_CONFIG.DEFAULTS.MAX_HISTORY_ITEMS,
        autoSave: EXTENSION_CONFIG.DEFAULTS.AUTO_SAVE,
        showTimestamps: EXTENSION_CONFIG.DEFAULTS.SHOW_TIMESTAMPS,
        theme: EXTENSION_CONFIG.DEFAULTS.THEME,
      }
      await chrome.storage.sync.set({
        [EXTENSION_CONFIG.STORAGE_KEYS.SETTINGS]: settings.value,
      })
      logger.info('Settings reset to defaults')
    } catch (error) {
      logger.error('Failed to reset settings', error as Error)
      throw error
    }
  }

  return {
    settings,
    isLoading,
    loadSettings,
    updateSettings,
    resetSettings,
  }
}
