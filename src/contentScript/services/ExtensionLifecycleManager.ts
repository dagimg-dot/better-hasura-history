import BetterHasuraHistory from '../main'
import { logger } from '../utils/logger'
import { waitForElement } from '../utils/waitForElement'
import { SettingsManager } from './SettingsManager'
import { createPageStrategy } from '../strategies'

export class ExtensionLifecycleManager {
  private bhhInstance: BetterHasuraHistory | null = null
  private isInitialized = false
  private currentPageType: string = 'unknown'

  async initialize(
    pageType: string,
    settings?: ReturnType<typeof SettingsManager.mergeSettings>,
  ): Promise<void> {
    const finalSettings = settings || (await SettingsManager.getSettings())
    this.currentPageType = pageType

    if (this.isInitialized) {
      logger.warn('Extension already initialized')
      return
    }

    try {
      logger.info(`Starting extension initialization for ${pageType}...`)
      const { buttonContainer, paneContainer } = await this.waitForRequiredElements(pageType)

      this.bhhInstance = new BetterHasuraHistory({ buttonContainer, paneContainer }, pageType)
      await this.bhhInstance.init({
        showOriginalHistory: finalSettings.showOriginalHistory,
      })

      this.isInitialized = true
      logger.info('Extension initialized successfully')
    } catch (error) {
      logger.error('Extension initialization failed', error as Error)
      this.cleanup()
      throw error
    }
  }

  private async waitForRequiredElements(pageType: string) {
    const strategy = createPageStrategy(pageType as 'graphiql' | 'sql')
    const selectors = strategy.getRequiredSelectors()

    const elements = await Promise.all(selectors.map((selector) => waitForElement(selector)))

    const missing = selectors.filter((s, i) => !elements[i])
    if (missing.length > 0) {
      throw new Error(`Required elements not found: ${missing.join(', ')}`)
    }

    const buttonContainer = elements[0]!
    const paneContainer = pageType === 'graphiql' ? elements[1]! : elements[0]!

    logger.debug('All required elements found')
    return { buttonContainer, paneContainer }
  }

  cleanup(): void {
    try {
      if (this.bhhInstance) {
        logger.info('Cleaning up extension...')
        this.bhhInstance.destroy()
        this.bhhInstance = null
      }
      this.isInitialized = false
      this.currentPageType = 'unknown'
      logger.info('Extension cleanup completed')
    } catch (error) {
      logger.error('Error during cleanup', error as Error)
      this.bhhInstance = null
      this.isInitialized = false
    }
  }

  async handleSettingsChange(oldSettings: any, newSettings: any): Promise<void> {
    const mergedOld = SettingsManager.mergeSettings(oldSettings)
    const mergedNew = SettingsManager.mergeSettings(newSettings)

    if (mergedOld.logLevel !== mergedNew.logLevel) {
      logger.setLogLevel(mergedNew.logLevel)
    }

    if (mergedOld.extensionEnabled !== mergedNew.extensionEnabled) {
      if (mergedNew.extensionEnabled) {
        await this.initialize(this.currentPageType || 'graphiql', mergedNew)
      } else {
        this.cleanup()
      }
    }
  }

  get initialized(): boolean {
    return this.isInitialized && this.bhhInstance !== null
  }
}
