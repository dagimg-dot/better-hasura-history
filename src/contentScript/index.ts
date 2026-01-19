import { ExtensionLifecycleManager, NavigationManager, SettingsManager } from './services'
import { logger } from './utils/logger'

// Inject the bridge script into the main page context
const script = document.createElement('script')
script.src = chrome.runtime.getURL('src/contentScript/script-injector.js')
// Reverting module type to classic script to avoid async-related document.write errors in Hasura UI
;(document.head || document.documentElement).prepend(script)

// --- Better Hasura History Lifecycle Management ---

const lifecycleManager = new ExtensionLifecycleManager()

/**
 * Initialize the navigation manager to handle SPA page changes.
 */
function initializeNavigation(): void {
  logger.debug('Initializing navigation manager to handle SPA lifecycle...')

  const navigationManager = new NavigationManager(
    document.body,
    () => {
      // Initialize the extension when the API explorer becomes visible
      SettingsManager.getSettings().then((settings) => {
        if (settings.extensionEnabled) {
          logger.debug('API Explorer detected - initializing extension...')
          lifecycleManager.initialize(settings).catch((error) => {
            logger.error('Failed to initialize extension on navigation', error as Error)
          })
        } else {
          logger.info('Extension is disabled, skipping initialization.')
        }
      })
    },
    () => {
      // Clean up the extension when the API explorer is no longer visible
      logger.debug('API Explorer hidden - cleaning up extension...')
      lifecycleManager.cleanup()
    },
  )

  navigationManager.start()
  logger.debug('Navigation manager started.')
}

// Start the lifecycle management
try {
  initializeNavigation()
} catch (error) {
  logger.error('Failed to start navigation manager', error as Error)
}

// Listen for settings changes (e.g., enabling/disabling the extension).
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  console.log('[Better Hasura History] Storage change detected:', { changes, namespace })
  if (namespace !== 'local' || !changes.settings) {
    return
  }

  try {
    const { oldValue, newValue } = changes.settings
    await lifecycleManager.handleSettingsChange(oldValue, newValue)
    logger.debug('Settings change handled successfully.')
  } catch (error) {
    logger.error('Error handling settings change', error as Error)
  }
})
