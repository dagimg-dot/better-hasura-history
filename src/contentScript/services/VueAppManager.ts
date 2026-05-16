import { type App, createApp } from 'vue'
import { ToolbarButtons } from '@/contentScript/components/controls'
import { HistoryPane } from '@/contentScript/components/history'
import { VueAppError } from '@/shared/errors'
import { logger } from '@/contentScript/utils/logger'
import type { IVueAppManager } from '@/shared/types/services'

export class VueAppManager implements IVueAppManager {
  private buttonApp: App | null = null
  private paneApp: App | null = null
  private isInitialized = false

  initializeApps(buttonContainer: HTMLElement, paneContainer: HTMLElement): void {
    if (this.isInitialized) {
      this.cleanup()
    }

    try {
      this.createButtonApp(buttonContainer)
      this.createPaneApp(paneContainer)
      this.isInitialized = true
    } catch (error) {
      logger.error('Failed to initialize Vue apps', error as Error)
      this.cleanup()
      throw error
    }
  }

  private createButtonApp(container: HTMLElement): void {
    try {
      this.buttonApp = createApp(ToolbarButtons)
      this.buttonApp.config.errorHandler = (err, instance, info) => {
        logger.error('Button app error:', err as Error, { info })
      }
      this.buttonApp.mount(container)
    } catch (error) {
      throw new VueAppError('Failed to create button app', { error })
    }
  }

  private createPaneApp(container: HTMLElement): void {
    try {
      this.paneApp = createApp(HistoryPane)
      this.paneApp.config.errorHandler = (err, instance, info) => {
        logger.error('Pane app error:', err as Error, { info })
      }
      this.paneApp.mount(container)
    } catch (error) {
      throw new VueAppError('Failed to create pane app', { error })
    }
  }

  cleanup(): void {
    try {
      this.buttonApp?.unmount()
      this.buttonApp = null
      this.paneApp?.unmount()
      this.paneApp = null
      this.isInitialized = false
    } catch (error) {
      logger.error('Error during Vue apps cleanup', error as Error)
      this.buttonApp = null
      this.paneApp = null
      this.isInitialized = false
    }
  }

  get initialized(): boolean {
    return this.isInitialized && this.buttonApp !== null && this.paneApp !== null
  }
}
