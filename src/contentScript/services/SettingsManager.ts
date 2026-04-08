import type { LogLevel } from '@/shared/logging/Logger'

interface Settings {
  extensionEnabled: boolean
  showOriginalHistory: boolean
  logLevel: LogLevel
}

export class SettingsManager {
  private static readonly DEFAULT_SETTINGS: Settings = {
    extensionEnabled: true,
    showOriginalHistory: false,
    logLevel: 'info',
  }

  static async getSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        resolve(this.mergeSettings(result.settings))
      })
    })
  }

  static mergeSettings(stored: any): Settings {
    return { ...this.DEFAULT_SETTINGS, ...stored }
  }

  static async saveSettings(settings: Partial<Settings>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ settings: this.mergeSettings(settings) }, () => resolve())
    })
  }
}
