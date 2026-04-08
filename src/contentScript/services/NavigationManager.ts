import { logger } from '../utils/logger'

export type PageType = 'graphiql' | 'sql' | 'unknown'

export class NavigationManager {
  private observer: MutationObserver | null = null
  private isExtensionActive = false
  private currentPageType: PageType = 'unknown'

  constructor(
    private readonly targetNode: Node,
    private readonly initCallback: (pageType: PageType) => void,
    private readonly destroyCallback: () => void,
  ) {}

  start(): void {
    if (this.observer) return

    this.observer = new MutationObserver(() => this.handleDOMChange())
    this.observer.observe(this.targetNode, { childList: true, subtree: true })
    this.handleDOMChange()
    logger.debug('NavigationManager started')
  }

  stop(): void {
    this.observer?.disconnect()
    this.observer = null
  }

  private isApiExplorerVisible(): boolean {
    return !!document.querySelector('.graphiql-container')
  }

  private isSqlPageVisible(): boolean {
    return !!document.getElementById('raw_sql')
  }

  private detectPageType(): PageType {
    if (this.isApiExplorerVisible()) return 'graphiql'
    if (this.isSqlPageVisible()) return 'sql'
    return 'unknown'
  }

  private handleDOMChange(): void {
    const pageType = this.detectPageType()
    const isVisible = pageType !== 'unknown'

    if (isVisible && !this.isExtensionActive) {
      logger.debug(`Page detected: ${pageType}`)
      this.currentPageType = pageType
      this.isExtensionActive = true
      this.initCallback(pageType)
    } else if (!isVisible && this.isExtensionActive) {
      logger.debug('Page hidden, cleaning up')
      this.currentPageType = 'unknown'
      this.isExtensionActive = false
      this.destroyCallback()
    }
  }

  getPageType(): PageType {
    return this.currentPageType
  }
}
