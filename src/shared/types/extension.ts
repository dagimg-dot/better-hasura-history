export interface ExtensionSettings {
  maxHistoryItems: number
  autoSave: boolean
  showTimestamps: boolean
  theme: 'light' | 'dark' | 'auto'
}

export interface ExtensionState {
  isActive: boolean
  isInitialized: boolean
  currentUrl: string
  settings: ExtensionSettings
}

export interface DOMElements {
  buttonContainer: HTMLElement | null
  paneContainer: HTMLElement | null
  targetElement: HTMLElement | null
}
