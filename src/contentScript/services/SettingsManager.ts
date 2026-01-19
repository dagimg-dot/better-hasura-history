import type { LogLevel } from '@/shared/logging/Logger'

/**
 * Centralized settings management for the Better Hasura History extension.
 * Handles default settings, storage operations, and settings validation.
 */
export class SettingsManager {
  private static readonly DEFAULT_SETTINGS: {
    extensionEnabled: boolean
    showOriginalHistory: boolean
    logLevel: LogLevel
  } = {
    extensionEnabled: true,
    showOriginalHistory: false,
    logLevel: 'info',
  } as const

  /**
   * Get settings from storage, merged with defaults.
   */
  static async getSettings(): Promise<typeof SettingsManager.DEFAULT_SETTINGS> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        resolve(SettingsManager.mergeSettings(result.settings))
      })
    })
  }

  /**
   * Merge stored settings with defaults, ensuring all required properties exist.
   */
  static mergeSettings(stored: any): typeof SettingsManager.DEFAULT_SETTINGS {
    return { ...SettingsManager.DEFAULT_SETTINGS, ...stored }
  }

  /**
   * Save settings to storage.
   */
  static async saveSettings(
    settings: Partial<typeof SettingsManager.DEFAULT_SETTINGS>,
  ): Promise<void> {
    return new Promise((resolve) => {
      const mergedSettings = SettingsManager.mergeSettings(settings)
      chrome.storage.local.set({ settings: mergedSettings }, () => {
        resolve()
      })
    })
  }

  /**
   * Get default settings.
   */
  static getDefaults(): typeof SettingsManager.DEFAULT_SETTINGS {
    return { ...SettingsManager.DEFAULT_SETTINGS }
  }
}
