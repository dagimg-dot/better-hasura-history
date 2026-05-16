import BetterHasuraHistory from '@/contentScript/main'
import { HistoryService } from '@/contentScript/services/HistoryService'
import { logger } from '@/contentScript/utils/logger'
import { waitForElement } from '@/contentScript/utils/waitForElement'
import { SettingsManager, type Settings } from './SettingsManager'
import { createPageStrategy } from '@/contentScript/strategies'
import type { PageType } from '@/shared/types/services'

export class ExtensionLifecycleManager {
  private bhhInstance: BetterHasuraHistory | null = null
  private isInitialized = false
  private currentPageType: PageType = 'unknown'

  async initialize(pageType: PageType, settings?: Settings): Promise<void> {
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
      HistoryService.useRootFieldAsFallbackName = finalSettings.useRootFieldAsFallbackName === true

      this.isInitialized = true
      logger.info('Extension initialized successfully')
    } catch (error) {
      logger.error('Extension initialization failed', error as Error)
      this.cleanup()
      throw error
    }
  }

  private async waitForRequiredElements(pageType: PageType) {
    const strategy = createPageStrategy(pageType)
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

  async handleSettingsChange(
    oldSettings: Record<string, unknown> | undefined,
    newSettings: Record<string, unknown> | undefined,
  ): Promise<void> {
    const mergedOld = SettingsManager.mergeSettings(oldSettings)
    const mergedNew = SettingsManager.mergeSettings(newSettings)

    if (mergedOld.showOriginalHistory !== mergedNew.showOriginalHistory) {
      if (this.bhhInstance) {
        this.bhhInstance.toggleOriginalHistory(mergedNew.showOriginalHistory)
      }
    }

    if (mergedOld.logLevel !== mergedNew.logLevel) {
      logger.setLogLevel(mergedNew.logLevel)
    }

    if (mergedOld.useRootFieldAsFallbackName !== mergedNew.useRootFieldAsFallbackName) {
      HistoryService.useRootFieldAsFallbackName = mergedNew.useRootFieldAsFallbackName === true
      if (mergedNew.useRootFieldAsFallbackName === true) {
        const count = HistoryService.recomputeUnnamedEntries()
        if (count > 0) {
          logger.info(`Recomputed ${count} unnamed entries with root field names`)
        }
      }
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
