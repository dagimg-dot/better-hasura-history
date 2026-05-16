import type { LogLevel } from '@/shared/logging/Logger'
import { StorageError } from '@/shared/errors'
import { logger } from '@/shared/logging'

export interface HostConfig {
  adminSecret: string
  graphqlEndpoint: string
}

export interface Settings {
  extensionEnabled: boolean
  showOriginalHistory: boolean
  logLevel: LogLevel
  adminSecret: string
  graphqlEndpoint: string
  hosts: Record<string, HostConfig>
}

function getCurrentHost(): string {
  const port = window.location.port
  return port ? `${window.location.hostname}:${port}` : window.location.hostname
}

export class SettingsManager {
  private static readonly HOST_CONFIG_DEFAULTS: HostConfig = {
    adminSecret: '',
    graphqlEndpoint: '',
  }

  private static readonly DEFAULT_SETTINGS: Settings = {
    extensionEnabled: true,
    showOriginalHistory: false,
    logLevel: 'info',
    adminSecret: '',
    graphqlEndpoint: '',
    hosts: {},
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
    const current = await this.getSettings()
    const merged: Settings = { ...current, ...settings }
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ settings: merged }, () => {
        if (chrome.runtime.lastError) {
          reject(new StorageError('Failed to save settings', { error: chrome.runtime.lastError }))
          return
        }
        resolve()
      })
    })
  }

  /**
   * Returns effective settings for a specific host, merging global defaults
   * with any per-host overrides for adminSecret and graphqlEndpoint.
   */
  static async getEffectiveSettings(hostname: string): Promise<Settings> {
    const settings = await this.getSettings()
    const hostConfig = settings.hosts?.[hostname]
    if (hostConfig) {
      return {
        ...settings,
        adminSecret: hostConfig.adminSecret || settings.adminSecret,
        graphqlEndpoint: hostConfig.graphqlEndpoint || settings.graphqlEndpoint,
      }
    }
    return settings
  }

  /**
   * Returns effective settings for the current window location.
   * Works in content script context where window.location is available.
   */
  static getCurrentHost(): string {
    return getCurrentHost()
  }

  static getCurrentHostSettings(): Promise<Settings> {
    return this.getEffectiveSettings(getCurrentHost())
  }

  /**
   * Saves or updates per-host credential overrides.
   */
  static async saveHostSettings(hostname: string, config: Partial<HostConfig>): Promise<void> {
    const settings = await this.getSettings()
    const existing = settings.hosts?.[hostname] || { ...this.HOST_CONFIG_DEFAULTS }
    settings.hosts = {
      ...settings.hosts,
      [hostname]: { ...existing, ...config },
    }
    return this.saveSettings({ hosts: settings.hosts })
  }
}
