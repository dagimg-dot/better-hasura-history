import { parseCodeMirrorHtml } from './utils/htmlParser'
import { logger } from './utils/logger'
import { DOMManager, VueAppManager, HistoryService } from './services'

/**
 * Required DOM elements for the extension to function.
 */
interface RequiredElements {
  toolbar: Element
  graphiqlContainer: Element
  executeButton: Element
}

/**
 * Main class for the Better Hasura History extension.
 */
class BetterHasuraHistory {
  private domManager: DOMManager
  private vueAppManager = new VueAppManager()
  private originalHistoryButton: HTMLElement | null = null
  private isInitialized = false

  constructor(elements: RequiredElements) {
    this.domManager = new DOMManager(elements.toolbar, elements.graphiqlContainer)

    this.handleExecuteClick = this.handleExecuteClick.bind(this)

    elements.executeButton.addEventListener('click', this.handleExecuteClick)
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
      logger.info('Initializing Better Hasura History extension...')

      const buttonContainer = this.domManager.createButtonContainer()
      const paneContainer = this.domManager.createPaneContainer()

      this.vueAppManager.initializeApps(buttonContainer, paneContainer)

      this.originalHistoryButton = this.domManager.findOriginalHistoryButton()
      this.toggleOriginalHistory(initialSettings.showOriginalHistory)

      this.isInitialized = true
      logger.info('Extension initialization completed successfully')
    } catch (error) {
      logger.error('Extension initialization failed', error)
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
      logger.info('Destroying Better Hasura History extension...')

      this.vueAppManager.cleanup()

      this.domManager.cleanup()

      // Restore original history button visibility
      this.toggleOriginalHistory(true)
      this.originalHistoryButton = null

      this.isInitialized = false
      logger.info('Extension destruction completed successfully')
    } catch (error) {
      logger.error('Error during extension destruction', error)
      // Force cleanup even if there were errors
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
      logger.info(`Original history button visibility: ${visible ? 'shown' : 'hidden'}`)
    } else {
      logger.warn('Original history button not found - cannot toggle visibility')
    }
  }

  /**
   * Handle the click event of the execute button.
   */
  private handleExecuteClick(): void {
    try {
      const parsed = parseCodeMirrorHtml()
      if (!parsed) {
        logger.warn('Failed to parse query from CodeMirror')
        return
      }

      const entry = HistoryService.addEntry(parsed)
      if (entry) {
        logger.info(`New history entry added: ${entry.operation_name}`)
      }
    } catch (error) {
      logger.error('Error handling execute click', error)
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
