import { type App } from 'vue'
import { DOMManager, HistoryService, VueAppManager } from './services'
import { logger } from './utils/logger'
import { createPageStrategy, type PageStrategy, type ParsedContent } from './strategies'
import type { PageType } from '@/shared/types/services'

export class BetterHasuraHistory {
  private strategy: PageStrategy
  private domManager: DOMManager
  private vueAppManager = new VueAppManager()
  private originalHistoryButton: HTMLElement | null = null
  private resizeObserver: ResizeObserver | null = null
  private betterQueryApp: App | null = null
  private betterQueryContainer: HTMLElement | null = null
  private refreshSchemaBtn: HTMLElement | null = null
  private isInitialized = false

  constructor(elements: { buttonContainer: Element; paneContainer: Element }, pageType: PageType) {
    this.strategy = createPageStrategy(pageType)
    this.domManager = new DOMManager(elements.buttonContainer, this.strategy)
    this.domManager.setContainers(elements.buttonContainer, elements.paneContainer)

    const runButtonSelector = this.strategy.getRunButtonSelector()
    const executeMessageType = this.strategy.getExecuteMessageType()
    const runButton = runButtonSelector ? document.querySelector(runButtonSelector) : null

    if (runButton) {
      runButton.addEventListener('click', () => {
        window.postMessage({ type: executeMessageType }, '*')
      })
    }

    window.addEventListener('message', this.handleMessage)
    logger.debug(`BetterHasuraHistory initialized for ${pageType}`)
  }

  private handleMessage = (event: MessageEvent): void => {
    if (event.source !== window) return

    const { type, data } = event.data
    const messageTypes = this.strategy.getMessageTypes()

    if (type === messageTypes.contentResponse) {
      try {
        const historyData = this.strategy.getHistoryItemData(data as ParsedContent)
        const entry = HistoryService.addEntry({ ...historyData })
        if (entry) {
          logger.info(`New history entry added: ${entry.operationName}`)
        }
      } catch (error) {
        logger.error('Error adding history entry', error as Error)
      }
    }
  }

  async init(settings: { showOriginalHistory: boolean }): Promise<void> {
    if (this.isInitialized) return

    logger.debug(`Initializing extension for ${this.strategy.pageType}...`)

    const buttonContainer = this.domManager.createButtonContainer(this.strategy)
    const paneContainer = this.domManager.createPaneContainer(this.strategy)

    const layoutHandler = this.strategy.getLayoutSetupHandler()
    if (
      layoutHandler &&
      buttonContainer instanceof HTMLElement &&
      paneContainer instanceof HTMLElement
    ) {
      layoutHandler(buttonContainer, paneContainer)
    }

    this.vueAppManager.initializeApps(buttonContainer, paneContainer)

    if (this.strategy.pageType === 'graphiql') {
      const refreshBtn = document.createElement('button')
      refreshBtn.id = 'bhh-refresh-schema-btn'
      refreshBtn.textContent = 'Refresh Schema'
      refreshBtn.title = 'Re-fetch GraphQL schema from the server'
      refreshBtn.style.cssText =
        'background:none;border:1px solid #ccc;border-radius:3px;cursor:pointer;font-size:12px;margin:0 5px;padding:3px 8px;color:#555;'
      refreshBtn.addEventListener('click', () => {
        refreshBtn.textContent = 'Refreshing...'
        window.postMessage({ type: 'BHH_REFRESH_SCHEMA' }, '*')
      })
      window.addEventListener('message', (e) => {
        if (e.source !== window) return
        if (e.data.type === 'BHH_SCHEMA_REFRESHED') {
          refreshBtn.textContent = e.data.success ? 'Refresh Schema' : 'Failed'
          setTimeout(() => { refreshBtn.textContent = 'Refresh Schema' }, 2000)
        }
      })
      buttonContainer.insertAdjacentElement('afterend', refreshBtn)
      this.refreshSchemaBtn = refreshBtn
    }

    if (this.strategy.pageType === 'sql') {
      try {
        const runButton = document.querySelector('[data-test="run-sql"]')
        if (runButton) {
          const container = document.createElement('div')
          runButton.insertAdjacentElement('afterend', container)
          const { createApp } = await import('vue')
          const { BetterQuery } = await import('./components/query')
          this.betterQueryApp = createApp(BetterQuery)
          this.betterQueryContainer = container
          this.betterQueryApp.mount(container)
          logger.debug('BetterQuery mounted')
        }
      } catch (error) {
        logger.error('Failed to inject BetterQuery', error as Error)
      }
    }

    if (this.strategy.shouldToggleOriginalHistory()) {
      const prettifyBtn = this.domManager.createPrettifyButton()
      prettifyBtn?.addEventListener('click', (e) => {
        e.stopPropagation()
        window.postMessage({ type: 'BHH_PRETTIFY_VARIABLES' }, '*')
      })
      this.originalHistoryButton = this.domManager.findOriginalHistoryButton()
      this.toggleOriginalHistory(settings.showOriginalHistory)
    }

    this.isInitialized = true
  }

  destroy(): void {
    if (!this.isInitialized) return

    this.vueAppManager.cleanup()
    this.domManager.cleanup()

    if (this.betterQueryApp) {
      this.betterQueryApp.unmount()
      this.betterQueryApp = null
    }
    if (this.betterQueryContainer) {
      this.betterQueryContainer.remove()
      this.betterQueryContainer = null
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    this.refreshSchemaBtn?.remove()
    this.refreshSchemaBtn = null

    window.removeEventListener('message', this.handleMessage)

    if (this.strategy.shouldToggleOriginalHistory()) {
      this.toggleOriginalHistory(true)
    }

    this.isInitialized = false
  }

  toggleOriginalHistory(visible: boolean): void {
    if (this.originalHistoryButton) {
      this.originalHistoryButton.style.display = visible ? '' : 'none'
    }
  }

  get initialized(): boolean {
    return this.isInitialized
  }
}

export default BetterHasuraHistory
