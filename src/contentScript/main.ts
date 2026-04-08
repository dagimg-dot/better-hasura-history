import { DOMManager, HistoryService, VueAppManager } from './services'
import { logger } from './utils/logger'
import { SqlLayoutHelper } from './utils/SqlLayoutHelper'
import { createPageStrategy, type PageStrategy, type ParsedContent } from './strategies'

export class BetterHasuraHistory {
  private strategy: PageStrategy
  private domManager: DOMManager
  private vueAppManager = new VueAppManager()
  private sqlLayoutHelper = new SqlLayoutHelper()
  private originalHistoryButton: HTMLElement | null = null
  private isInitialized = false

  constructor(elements: { buttonContainer: Element; paneContainer: Element }, pageType: string) {
    this.strategy = createPageStrategy(pageType as 'graphiql' | 'sql')
    this.domManager = new DOMManager(elements.buttonContainer, this.strategy)

    if (pageType === 'graphiql') {
      const runButton = document.querySelector('.execute-button')
      runButton?.addEventListener('click', this.handleExecuteClick)
    } else if (pageType === 'sql') {
      const runButton = document.querySelector('[data-test="run-sql"]')
      runButton?.addEventListener('click', this.handleRunClick)
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

  private handleExecuteClick = (): void => {
    window.postMessage({ type: 'BHH_GET_EDITOR_CONTENT' }, '*')
  }

  private handleRunClick = (): void => {
    window.postMessage({ type: 'BHH_GET_SQL_CONTENT' }, '*')
  }

  async init(settings: { showOriginalHistory: boolean }): Promise<void> {
    if (this.isInitialized) return

    logger.debug(`Initializing extension for ${this.strategy.pageType}...`)

    const buttonContainer = this.domManager.createButtonContainer(this.strategy)
    const paneContainer = this.domManager.createPaneContainer(this.strategy)

    if (this.strategy.pageType === 'sql') {
      const sqlEditor = document.getElementById('raw_sql') as HTMLElement
      const dataSourceSelect = document.querySelector(
        'select[name="data-source"]',
      ) as HTMLSelectElement
      if (sqlEditor && paneContainer instanceof HTMLElement) {
        this.sqlLayoutHelper.wrapEditorWithPane(sqlEditor, paneContainer)
      }
      if (dataSourceSelect && buttonContainer instanceof HTMLElement) {
        this.sqlLayoutHelper.wrapSelectWithButton(dataSourceSelect, buttonContainer)
      }
    }

    this.vueAppManager.initializeApps(buttonContainer, paneContainer)

    if (this.strategy.pageType === 'graphiql') {
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
    this.sqlLayoutHelper.cleanup()
    window.removeEventListener('message', this.handleMessage)

    if (this.strategy.pageType === 'graphiql') {
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
