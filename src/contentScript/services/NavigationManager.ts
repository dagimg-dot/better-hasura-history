import { logger } from '../utils/logger'

/**
 * Manages the extension's lifecycle in a Single-Page Application (SPA) environment.
 * It uses a MutationObserver to detect when the target UI elements are added or removed from the DOM,
 * and then triggers the appropriate initialization or cleanup callbacks.
 */
export class NavigationManager {
  private observer: MutationObserver | null = null
  private isExtensionActive = false

  /**
   * @param targetNode The DOM node to observe for changes.
   * @param initCallback A callback function to initialize the extension.
   * @param destroyCallback A callback function to clean up the extension.
   */
  constructor(
    private readonly targetNode: Node,
    private readonly initCallback: () => void,
    private readonly destroyCallback: () => void,
  ) {}

  /**
   * Starts observing the DOM for changes.
   */
  public start(): void {
    if (this.observer) {
      logger.warn('NavigationManager is already running.')
      return
    }

    this.observer = new MutationObserver(() => {
      this.handleDOMChange()
    })

    this.observer.observe(this.targetNode, {
      childList: true,
      subtree: true,
    })

    // Perform an initial check in case the API explorer is already on the page.
    this.handleDOMChange()
    logger.debug('NavigationManager started.')
  }

  /**
   * Stops observing the DOM for changes.
   */
  public stop(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
      logger.debug('NavigationManager stopped.')
    }
  }

  /**
   * Checks if the API explorer elements are present in the DOM.
   * The presence of '.graphiql-container' is a strong indicator of the API explorer page.
   */
  private isApiExplorerVisible(): boolean {
    return !!document.querySelector('.graphiql-container')
  }

  /**
   * This method is called whenever the DOM changes. It checks for the
   * presence of the API explorer and initializes or destroys the extension.
   */
  private handleDOMChange(): void {
    const isVisible = this.isApiExplorerVisible()

    if (isVisible && !this.isExtensionActive) {
      logger.debug('API Explorer view detected. Initializing extension...')
      this.isExtensionActive = true
      this.initCallback()
    } else if (!isVisible && this.isExtensionActive) {
      logger.debug('API Explorer view is no longer visible. Cleaning up extension...')
      this.isExtensionActive = false
      this.destroyCallback()
    }
  }
}
