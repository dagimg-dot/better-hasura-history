import { logger } from '../utils/logger'

export type PageType = 'graphiql' | 'sql' | 'unknown'

const PAGE_DETECTION_DELAY = 200

export class NavigationManager {
  private observer: MutationObserver | null = null
  private isExtensionActive = false
  private currentPageType: PageType = 'unknown'
  private pendingInitTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly targetNode: Node,
    private readonly initCallback: (pageType: PageType) => void,
    private readonly destroyCallback: () => void,
  ) {}

  start(): void {
    if (this.observer) {
      return
    }

    this.observer = new MutationObserver(() => {
      this.handleDOMChange()
    })
    this.observer.observe(this.targetNode, { childList: true, subtree: true })

    this.handleDOMChange()
    logger.debug('NavigationManager started')
  }

  stop(): void {
    this.observer?.disconnect()
    this.observer = null
    if (this.pendingInitTimeout) {
      clearTimeout(this.pendingInitTimeout)
      this.pendingInitTimeout = null
    }
  }

  private isApiExplorerVisible(): boolean {
    return !!document.querySelector('.graphiql-container')
  }

  private isSqlPageVisible(): boolean {
    return !!document.getElementById('raw_sql')
  }

  private isApiExplorerRoute(): boolean {
    const path = window.location.pathname
    return (
      path.includes('/console/api/api-explorer') ||
      path === '/console/' ||
      path === '/' ||
      path.endsWith('/api-explorer')
    )
  }

  private isSqlRoute(): boolean {
    const path = window.location.pathname
    return path.includes('/console/data/sql')
  }

  private detectPageType(): PageType {
    const hasGraphiQLContainer = this.isApiExplorerVisible()
    const hasSqlEditor = this.isSqlPageVisible()
    const isApiExplorerUrl = this.isApiExplorerRoute()
    const isSqlUrl = this.isSqlRoute()
    const readyState = document.readyState

    logger.debug(
      `detectPageType: hasGraphiQL=${hasGraphiQLContainer}, hasSql=${hasSqlEditor}, isApiUrl=${isApiExplorerUrl}, isSqlUrl=${isSqlUrl}, readyState=${readyState}`,
    )

    if (hasGraphiQLContainer) return 'graphiql'
    if (hasSqlEditor) return 'sql'
    if (isApiExplorerUrl && readyState === 'complete') {
      return 'graphiql'
    }
    if (isSqlUrl && readyState === 'complete') {
      return 'sql'
    }
    return 'unknown'
  }

  private handleDOMChange = (): void => {
    const pageType = this.detectPageType()
    const isVisible = pageType !== 'unknown'

    logger.debug(
      `handleDOMChange: pageType=${pageType}, isVisible=${isVisible}, isActive=${this.isExtensionActive}, url=${window.location.pathname}`,
    )

    const pageTypeChanged =
      isVisible &&
      this.isExtensionActive &&
      this.currentPageType !== 'unknown' &&
      this.currentPageType !== pageType

    if (pageTypeChanged) {
      logger.debug(
        `Page type changed from ${this.currentPageType} to ${pageType}, cleaning up first...`,
      )

      this.currentPageType = 'unknown'
      this.isExtensionActive = false
      this.destroyCallback()

      setTimeout(() => {
        logger.debug('Post-page-change recheck, scheduling init...')
        this.handleDOMChange()
      }, PAGE_DETECTION_DELAY)
      return
    }

    if (isVisible && !this.isExtensionActive) {
      logger.debug(`Page detected: ${pageType}, scheduling initialization...`)

      if (this.pendingInitTimeout) {
        clearTimeout(this.pendingInitTimeout)
      }

      this.pendingInitTimeout = setTimeout(() => {
        const currentPageType = this.detectPageType()
        logger.debug(
          `Timeout fired: currentPageType=${currentPageType}, isActive=${this.isExtensionActive}`,
        )

        if (currentPageType !== 'unknown' && !this.isExtensionActive) {
          this.currentPageType = currentPageType
          this.isExtensionActive = true
          this.pendingInitTimeout = null
          this.initCallback(currentPageType)
        } else {
          logger.debug(
            `Skipping init: currentPageType=${currentPageType}, isActive=${this.isExtensionActive}`,
          )
        }
      }, PAGE_DETECTION_DELAY)
    } else if (!isVisible && this.isExtensionActive) {
      logger.debug('Page hidden, cleaning up...')
      this.currentPageType = 'unknown'
      this.isExtensionActive = false
      this.destroyCallback()

      setTimeout(() => {
        logger.debug('Post-cleanup recheck...')
        this.handleDOMChange()
      }, 50)
    }
  }

  getPageType(): PageType {
    return this.currentPageType
  }
}
