import { createApp, type App } from 'vue'
import { ToolbarButtons } from '@/contentScript/components/controls'
import { HistoryPane } from '@/contentScript/components/history'
import { BetterQuery } from '@/contentScript/components/query'
import { SessionPane } from '@/contentScript/components/sessions'
import { VueAppError } from '@/shared/errors'
import { logger } from '@/contentScript/utils/logger'
import type { IVueAppManager } from '@/shared/types/services'

export class VueAppManager implements IVueAppManager {
  private buttonApp: App | null = null
  private paneApp: App | null = null
  private sessionPaneApp: App | null = null
  private sessionPaneContainer: HTMLElement | null = null
  private betterQueryApp: App | null = null
  private betterQueryContainer: HTMLElement | null = null
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

  injectSessionPane(apiBlock: HTMLElement): void {
    const lastDetails = apiBlock.querySelector('details:last-of-type')
    if (!lastDetails) {
      logger.debug('SessionPane: no <details> found in #apiRequestBlock')
      return
    }

    const container = document.createElement('div')
    container.id = 'better-session-container'
    container.setAttribute('data-v-app', '')

    try {
      lastDetails.insertAdjacentElement('afterend', container)
      this.sessionPaneApp = createApp(SessionPane)
      this.sessionPaneApp.config.errorHandler = (err, instance, info) => {
        logger.error('SessionPane app error:', err as Error, { info })
      }
      this.sessionPaneContainer = container
      this.sessionPaneApp.mount(container)
      logger.debug('SessionPane mounted')
    } catch (error) {
      container.remove()
      this.sessionPaneApp = null
      this.sessionPaneContainer = null
      throw new VueAppError('Failed to create session pane app', { error })
    }
  }

  removeSessionPane(): void {
    try {
      this.sessionPaneApp?.unmount()
      this.sessionPaneApp = null
    } catch (error) {
      logger.error('Error during SessionPane unmount', error as Error)
      this.sessionPaneApp = null
    }

    if (this.sessionPaneContainer) {
      this.sessionPaneContainer.remove()
      this.sessionPaneContainer = null
    }
  }

  injectBetterQuery(runButton: HTMLElement): void {
    const container = document.createElement('div')
    runButton.insertAdjacentElement('afterend', container)

    try {
      this.betterQueryApp = createApp(BetterQuery)
      this.betterQueryApp.config.errorHandler = (err, instance, info) => {
        logger.error('BetterQuery app error:', err as Error, { info })
      }
      this.betterQueryContainer = container
      this.betterQueryApp.mount(container)
      logger.debug('BetterQuery mounted')
    } catch (error) {
      container.remove()
      this.betterQueryApp = null
      this.betterQueryContainer = null
      throw new VueAppError('Failed to create BetterQuery app', { error })
    }
  }

  removeBetterQuery(): void {
    try {
      this.betterQueryApp?.unmount()
      this.betterQueryApp = null
    } catch (error) {
      logger.error('Error during BetterQuery unmount', error as Error)
      this.betterQueryApp = null
    }

    if (this.betterQueryContainer) {
      this.betterQueryContainer.remove()
      this.betterQueryContainer = null
    }
  }

  cleanup(): void {
    try {
      this.removeSessionPane()
      this.removeBetterQuery()
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
