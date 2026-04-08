import { DOMManager, HistoryService, VueAppManager } from './services'
import { logger } from './utils/logger'
import { createPageStrategy, type PageStrategy, type ParsedContent } from './strategies'

export class BetterHasuraHistory {
  private strategy: PageStrategy
  private domManager: DOMManager
  private vueAppManager = new VueAppManager()
  private originalHistoryButton: HTMLElement | null = null
  private resizeObserver: ResizeObserver | null = null
  private isInitialized = false

  constructor(elements: { buttonContainer: Element; paneContainer: Element }, pageType: string) {
    this.strategy = createPageStrategy(pageType as 'graphiql' | 'sql')
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
        const entry = HistoryService.addEntry({
          ...historyData,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        } as any)
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

    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

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
