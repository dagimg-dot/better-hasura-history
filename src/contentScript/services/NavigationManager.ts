import { logger } from '../utils/logger'

export type PageType = 'graphiql' | 'sql' | 'unknown'

/**
 * Manages the extension's lifecycle in a Single-Page Application (SPA) environment.
 * It uses a MutationObserver to detect when the target UI elements are added or removed from the DOM,
 * and then triggers the appropriate initialization or cleanup callbacks.
 */
export class NavigationManager {
  private observer: MutationObserver | null = null
  private isExtensionActive = false
  private currentPageType: PageType = 'unknown'

  /**
   * @param targetNode The DOM node to observe for changes.
   * @param initCallback A callback function to initialize the extension.
   * @param destroyCallback A callback function to clean up the extension.
   */
  constructor(
    private readonly targetNode: Node,
    private readonly initCallback: (pageType: PageType) => void,
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
   * Checks if the SQL page elements are present in the DOM.
   * The presence of '#raw_sql' with ace_editor class is a strong indicator of the SQL page.
   */
  private isSqlPageVisible(): boolean {
    return !!document.getElementById('raw_sql')
  }

  /**
   * Gets the current page type based on which elements are present.
   */
  private detectPageType(): PageType {
    if (this.isApiExplorerVisible()) {
      return 'graphiql'
    }
    if (this.isSqlPageVisible()) {
      return 'sql'
    }
    return 'unknown'
  }

  /**
   * This method is called whenever the DOM changes. It checks for the
   * presence of the API explorer or SQL page and initializes or destroys the extension.
   */
  private handleDOMChange(): void {
    const pageType = this.detectPageType()
    const isVisible = pageType !== 'unknown'

    if (isVisible && !this.isExtensionActive) {
      logger.debug(`Page type detected: ${pageType}. Initializing extension...`)
      this.currentPageType = pageType
      this.isExtensionActive = true
      this.initCallback(pageType)
    } else if (!isVisible && this.isExtensionActive) {
      logger.debug(`${this.currentPageType} view is no longer visible. Cleaning up extension...`)
      this.currentPageType = 'unknown'
      this.isExtensionActive = false
      this.destroyCallback()
    }
  }

  /**
   * Gets the current page type.
   */
  public getPageType(): PageType {
    return this.currentPageType
  }
}
