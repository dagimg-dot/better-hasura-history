import BetterHasuraHistory from '../main'
import { logger } from '../utils/logger'
import { waitForElement } from '../utils/waitForElement'
import { SettingsManager } from './SettingsManager'

/**
 * Required DOM elements for the extension to function.
 */
interface RequiredElements {
  toolbar: Element
  graphiqlContainer: Element
  executeButton: Element
}

/**
 * Manages the lifecycle of the Better Hasura History extension.
 * Handles initialization, cleanup, and settings changes.
 */
export class ExtensionLifecycleManager {
  private bhhInstance: BetterHasuraHistory | null = null
  private isInitialized = false

  /**
   * Initialize the extension with the provided settings.
   */
  async initialize(settings?: ReturnType<typeof SettingsManager.mergeSettings>): Promise<void> {
    const finalSettings = settings || (await SettingsManager.getSettings())
    console.info(
      '[Better Hasura History] ExtensionLifecycleManager.initialize called with settings:',
      finalSettings,
    )
    logger.debug('Initializing extension with settings:', finalSettings)

    // Apply log level setting
    if (finalSettings.logLevel) {
      logger.setLogLevel(finalSettings.logLevel)
    }

    if (this.isInitialized) {
      logger.warn('Extension already initialized - skipping')
      return
    }

    try {
      logger.info('Starting extension initialization...')
      const elements = await this.waitForRequiredElements()

      this.bhhInstance = new BetterHasuraHistory(elements)
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

  /**
   * Wait for all required DOM elements to be available.
   */
  private async waitForRequiredElements(): Promise<RequiredElements> {
    logger.debug('Waiting for required DOM elements...')

    const elementPromises = [
      waitForElement('.toolbar'),
      waitForElement('.graphiql-container'),
      waitForElement('.execute-button'),
    ] as const

    const [toolbar, graphiqlContainer, executeButton] = await Promise.all(elementPromises)

    if (!toolbar || !graphiqlContainer || !executeButton) {
      const missing = []
      if (!toolbar) missing.push('.toolbar')
      if (!graphiqlContainer) missing.push('.graphiql-container')
      if (!executeButton) missing.push('.execute-button')

      throw new Error(`Required DOM elements not found: ${missing.join(', ')}`)
    }

    logger.debug('All required DOM elements found')
    return { toolbar, graphiqlContainer, executeButton }
  }

  /**
   * Clean up the extension instance and resources.
   */
  cleanup(): void {
    try {
      if (this.bhhInstance) {
        logger.info('Cleaning up extension instance...')
        this.bhhInstance.destroy()
        this.bhhInstance = null
      }

      this.isInitialized = false
      logger.info('Extension cleanup completed')
    } catch (error) {
      logger.error('Error during extension cleanup', error as Error)
      // Force reset even if cleanup failed
      this.bhhInstance = null
      this.isInitialized = false
    }
  }

  /**
   * Toggle the original history button visibility.
   */
  toggleOriginalHistory(show: boolean): void {
    if (!this.bhhInstance) {
      logger.warn('Cannot toggle original history - extension not initialized')
      return
    }

    try {
      this.bhhInstance.toggleOriginalHistory(show)
      logger.info(`Original history visibility set to: ${show}`)
    } catch (error) {
      logger.error('Failed to toggle original history', error as Error)
    }
  }

  /**
   * Handle settings changes from storage.
   */
  async handleSettingsChange(oldSettings: any, newSettings: any): Promise<void> {
    const mergedOld = SettingsManager.mergeSettings(oldSettings)
    const mergedNew = SettingsManager.mergeSettings(newSettings)
    console.info('[Better Hasura History] handleSettingsChange:', {
      old: mergedOld,
      new: mergedNew,
    })
    logger.debug('Settings changed:', { old: mergedOld, new: mergedNew })

    // Handle log level change
    if (mergedOld.logLevel !== mergedNew.logLevel) {
      logger.setLogLevel(mergedNew.logLevel)
      logger.info(`Log level updated to: ${mergedNew.logLevel}`)
    }

    // Handle extension enable/disable
    if (mergedOld.extensionEnabled !== mergedNew.extensionEnabled) {
      if (mergedNew.extensionEnabled) {
        logger.info('Extension enabled - initializing...')
        await this.initialize(mergedNew)
      } else {
        logger.info('Extension disabled - cleaning up...')
        this.cleanup()
      }
      return
    }

    // Handle original history visibility toggle
    if (this.isInitialized && mergedOld.showOriginalHistory !== mergedNew.showOriginalHistory) {
      this.toggleOriginalHistory(mergedNew.showOriginalHistory)
    }
  }

  /**
   * Check if the extension is initialized.
   */
  get initialized(): boolean {
    return this.isInitialized && this.bhhInstance !== null
  }

  /**
   * Get the current extension instance (for testing purposes).
   */
  get instance(): BetterHasuraHistory | null {
    return this.bhhInstance
  }
}
