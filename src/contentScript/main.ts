import { DOMManager, HistoryService, VueAppManager } from './services'
import { logger } from './utils/logger'
import type { PageType } from './services/NavigationManager'

/**
 * Required DOM elements for the extension to function.
 */
interface GraphiQLElements {
  toolbar: Element
  graphiqlContainer: Element
  executeButton: Element
}

interface SQLElements {
  rawSqlContainer: Element
  runButton: Element
}

type RequiredElements = GraphiQLElements | SQLElements

/**
 * Main class for the Better Hasura History extension.
 */
class BetterHasuraHistory {
  private domManager!: DOMManager
  private vueAppManager = new VueAppManager()
  private originalHistoryButton: HTMLElement | null = null
  private isInitialized = false
  private pageType: PageType

  constructor(elements: RequiredElements, pageType: PageType) {
    this.pageType = pageType

    if (pageType === 'graphiql') {
      const graphiqlElements = elements as GraphiQLElements
      this.domManager = new DOMManager(graphiqlElements.graphiqlContainer, pageType)
      this.handleExecuteClick = this.handleExecuteClick.bind(this)
      this.handleMessage = this.handleMessage.bind(this)
      graphiqlElements.executeButton.addEventListener('click', this.handleExecuteClick)
    } else if (pageType === 'sql') {
      const sqlElements = elements as SQLElements
      this.domManager = new DOMManager(sqlElements.rawSqlContainer, pageType)
      this.handleRunClick = this.handleRunClick.bind(this)
      this.handleMessage = this.handleSqlMessage.bind(this)
      sqlElements.runButton.addEventListener('click', this.handleRunClick)
    }

    window.addEventListener('message', this.handleMessage)
    logger.debug(`BetterHasuraHistory initialized for ${pageType} and listening for messages.`)
  }

  private handleMessage(event: MessageEvent): void {
    if (event.source !== window) return

    const { type, data } = event.data
    logger.debug(`BetterHasuraHistory received message: ${type}`)

    if (this.pageType === 'graphiql' && type === 'BHH_EDITOR_CONTENT_RESPONSE') {
      try {
        const entry = HistoryService.addEntry(data)
        if (entry) {
          logger.info(`New history entry added: ${entry.operationName}`)
        }
      } catch (error) {
        logger.error('Error adding history entry from response', error as Error)
      }
    }
  }

  private handleSqlMessage(event: MessageEvent): void {
    if (event.source !== window) return

    const { type, data } = event.data
    logger.debug(`BetterHasuraHistory received message: ${type}`)

    if (type === 'BHH_SQL_CONTENT_RESPONSE') {
      try {
        const entry = HistoryService.addSqlEntry(data)
        if (entry) {
          logger.info(`New SQL history entry added: ${entry.operationName}`)
        }
      } catch (error) {
        logger.error('Error adding SQL history entry from response', error as Error)
      }
    }
  }

  /**
   * Initialize the Better Hasura History extension.
   * @param initialSettings - The initial settings for the extension.
   */
  async init(initialSettings: { showOriginalHistory: boolean }): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Extension already initialized')
      return
    }

    try {
      logger.debug(`Initializing Better Hasura History extension for ${this.pageType}...`)

      const buttonContainer = this.domManager.createButtonContainer()
      const paneContainer = this.domManager.createPaneContainer()

      this.vueAppManager.initializeApps(buttonContainer, paneContainer)

      if (this.pageType === 'graphiql') {
        const prettifyBtn = this.domManager.createPrettifyButton()
        if (prettifyBtn) {
          prettifyBtn.addEventListener('click', (event) => {
            event.stopPropagation()
            event.preventDefault()
            window.postMessage({ type: 'BHH_PRETTIFY_VARIABLES' }, '*')
          })
        }

        this.originalHistoryButton = this.domManager.findOriginalHistoryButton()
        this.toggleOriginalHistory(initialSettings.showOriginalHistory)
      }

      this.isInitialized = true
      logger.debug('Extension initialization completed successfully')
    } catch (error) {
      logger.error('Extension initialization failed', error as Error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Destroy the Better Hasura History extension.
   */
  destroy(): void {
    if (!this.isInitialized) {
      logger.warn('Extension not initialized - nothing to destroy')
      return
    }

    try {
      logger.debug(`Destroying Better Hasura History extension for ${this.pageType}...`)

      this.vueAppManager.cleanup()

      this.domManager.cleanup()

      window.removeEventListener('message', this.handleMessage)

      if (this.pageType === 'graphiql') {
        this.toggleOriginalHistory(true)
      }
      this.originalHistoryButton = null

      this.isInitialized = false
      logger.debug('Extension destruction completed successfully')
    } catch (error) {
      logger.error('Error during extension destruction', error as Error)
      this.cleanup()
    }
  }

  /**
   * Force cleanup of resources (used internally).
   */
  private cleanup(): void {
    this.vueAppManager.cleanup()
    this.domManager.cleanup()
    this.originalHistoryButton = null
    this.isInitialized = false
  }

  /**
   * Toggle the visibility of the original history button.
   * @param visible - Whether to show the original history button.
   */
  toggleOriginalHistory(visible: boolean): void {
    if (this.originalHistoryButton) {
      this.originalHistoryButton.style.display = visible ? '' : 'none'
      logger.debug(`Original history button visibility: ${visible ? 'shown' : 'hidden'}`)
    } else {
      logger.warn('Original history button not found - cannot toggle visibility')
    }
  }

  /**
   * Handle the click event of the execute button (GraphiQL).
   */
  private handleExecuteClick(): void {
    try {
      window.postMessage({ type: 'BHH_GET_EDITOR_CONTENT' }, '*')
    } catch (error) {
      logger.error('Error triggering content capture', error as Error)
    }
  }

  /**
   * Handle the click event of the Run button (SQL).
   */
  private handleRunClick(): void {
    try {
      window.postMessage({ type: 'BHH_GET_SQL_CONTENT' }, '*')
    } catch (error) {
      logger.error('Error triggering SQL content capture', error as Error)
    }
  }

  /**
   * Get the initialization status of the extension.
   */
  get initialized(): boolean {
    return this.isInitialized
  }

  /**
   * Get the DOM manager instance (for testing purposes).
   */
  get domManagerInstance(): DOMManager {
    return this.domManager
  }

  /**
   * Get the Vue app manager instance (for testing purposes).
   */
  get vueAppManagerInstance(): VueAppManager {
    return this.vueAppManager
  }
}

export default BetterHasuraHistory
