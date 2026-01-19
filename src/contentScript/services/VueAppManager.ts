import { type App, createApp } from 'vue'
import { BetterHistoryBtn } from '@/contentScript/components/controls'
import { HistoryPane } from '@/contentScript/components/history'
import { logger } from '@/contentScript/utils/logger'

/**
 * Manages Vue application lifecycle for the Better Hasura History extension.
 * Handles mounting, unmounting, and error handling for Vue components.
 */
export class VueAppManager {
  private buttonApp: App | null = null
  private paneApp: App | null = null
  private isInitialized = false

  /**
   * Initialize both Vue applications.
   */
  initializeApps(buttonContainer: HTMLElement, paneContainer: HTMLElement): void {
    if (this.isInitialized) {
      logger.warn('Vue apps already initialized - cleaning up first')
      this.cleanup()
    }

    try {
      this.createButtonApp(buttonContainer)
      this.createPaneApp(paneContainer)
      this.isInitialized = true
      logger.debug('Vue apps initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Vue apps', error as Error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Create and mount the button Vue app.
   */
  private createButtonApp(container: HTMLElement): void {
    this.buttonApp = createApp(BetterHistoryBtn)

    this.buttonApp.config.errorHandler = (err, instance, info) => {
      logger.error('Button app error:', err as Error, { info })
    }

    this.buttonApp.mount(container)
  }

  /**
   * Create and mount the pane Vue app.
   */
  private createPaneApp(container: HTMLElement): void {
    this.paneApp = createApp(HistoryPane)

    this.paneApp.config.errorHandler = (err, instance, info) => {
      logger.error('Pane app error:', err as Error, { info })
    }

    this.paneApp.mount(container)
  }

  /**
   * Clean up all Vue applications.
   */
  cleanup(): void {
    try {
      if (this.buttonApp) {
        this.buttonApp.unmount()
        this.buttonApp = null
      }

      if (this.paneApp) {
        this.paneApp.unmount()
        this.paneApp = null
      }

      this.isInitialized = false
      logger.debug('Vue apps cleaned up successfully')
    } catch (error) {
      logger.error('Error during Vue apps cleanup', error as Error)
      // Force reset even if cleanup failed
      this.buttonApp = null
      this.paneApp = null
      this.isInitialized = false
    }
  }

  /**
   * Check if the Vue apps are initialized.
   */
  get initialized(): boolean {
    return this.isInitialized && this.buttonApp !== null && this.paneApp !== null
  }

  /**
   * Get the button app instance (for testing purposes).
   */
  get buttonAppInstance(): App | null {
    return this.buttonApp
  }

  /**
   * Get the pane app instance (for testing purposes).
   */
  get paneAppInstance(): App | null {
    return this.paneApp
  }
}
