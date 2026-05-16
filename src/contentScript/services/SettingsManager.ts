import type { LogLevel } from '@/shared/logging/Logger'
import { StorageError } from '@/shared/errors'
import { logger } from '@/shared/logging'

interface Settings {
  extensionEnabled: boolean
  showOriginalHistory: boolean
  logLevel: LogLevel
  adminSecret: string
  graphqlEndpoint: string
}

export class SettingsManager {
  private static readonly DEFAULT_SETTINGS: Settings = {
    extensionEnabled: true,
    showOriginalHistory: false,
    logLevel: 'info',
    adminSecret: '',
    graphqlEndpoint: '',
  }

  static async getSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        if (chrome.runtime.lastError) {
          logger.error(
            'Failed to load settings',
            new StorageError(chrome.runtime.lastError.message || 'Unknown error'),
          )
        }
        resolve(this.mergeSettings(result.settings))
      })
    })
  }

  static mergeSettings(stored: Record<string, unknown> | undefined): Settings {
    return { ...this.DEFAULT_SETTINGS, ...stored }
  }

  static async saveSettings(settings: Partial<Settings>): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ settings: this.mergeSettings(settings) }, () => {
        if (chrome.runtime.lastError) {
          reject(new StorageError('Failed to save settings', { error: chrome.runtime.lastError }))
          return
        }
        resolve()
      })
    })
  }
}
