import type { App } from 'vue'
import type { ExtensionSettings, HistoryItem, HistorySearchOptions } from './index'

export interface IHistoryService {
  getHistory(): Promise<HistoryItem[]>
  saveHistoryItem(item: HistoryItem): Promise<void>
  searchHistory(options: HistorySearchOptions): Promise<HistoryItem[]>
  clearHistory(): Promise<void>
  deleteHistoryItem(id: string): Promise<void>
}

export interface IVueAppManager {
  initializeApps(buttonContainer: HTMLElement, paneContainer: HTMLElement): void
  cleanup(): void
  readonly initialized: boolean
  readonly buttonAppInstance: App | null
  readonly paneAppInstance: App | null
}

export interface ISettingsManager {
  getSettings(): Promise<ExtensionSettings>
  updateSettings(settings: Partial<ExtensionSettings>): Promise<void>
  resetSettings(): Promise<void>
}

export interface IDOMManager {
  findTargetElement(): HTMLElement | null
  createContainers(): {
    buttonContainer: HTMLElement
    paneContainer: HTMLElement
  }
  cleanup(): void
  observeChanges(callback: () => void): void
}

export interface INavigationManager {
  onNavigate(callback: () => void): void
  getCurrentUrl(): string
  isTargetPage(): boolean
}
