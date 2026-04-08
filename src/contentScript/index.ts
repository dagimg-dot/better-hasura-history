import { ExtensionLifecycleManager, NavigationManager, SettingsManager } from './services'
import { logger } from './utils/logger'
import type { PageType } from './services/NavigationManager'
import { useExtensionState } from './composables/useExtensionState'
import { useHistory } from './composables/useHistory'

// Inject the bridge script into the main page context
const script = document.createElement('script')
script.src = chrome.runtime.getURL('src/contentScript/script-injector.js')
// Reverting module type to classic script to avoid async-related document-write errors in Hasura UI
;(document.head || document.documentElement).prepend(script)

// Listen for export requests from the injected script
window.addEventListener('message', (event) => {
  if (event.source !== window) return

  const { type, data } = event.data

  if (type === 'BHH_EXPORT_HISTORY_REQUEST') {
    logger.debug('Received export request from page script, forwarding to background')

    // Forward to background script (fire and forget)
    chrome.runtime.sendMessage({
      type: 'BHH_DOWNLOAD_HISTORY',
      data: data,
    })
  }
})

// --- Better Hasura History Lifecycle Management ---

const lifecycleManager = new ExtensionLifecycleManager()

/**
 * Initialize the navigation manager to handle SPA page changes.
 */
function initializeNavigation(): void {
  logger.debug('Initializing navigation manager to handle SPA lifecycle...')

  const navigationManager = new NavigationManager(
    document.body,
    (pageType: PageType) => {
      // Initialize the extension when the API explorer or SQL page becomes visible
      SettingsManager.getSettings().then((settings) => {
        if (settings.extensionEnabled) {
          logger.debug(
            `${pageType === 'graphiql' ? 'API Explorer' : 'SQL Page'} detected - initializing extension...`,
          )
          lifecycleManager.initialize(pageType, settings).catch((error) => {
            logger.error('Failed to initialize extension on navigation', error as Error)
          })

          // Set the page filter for history based on page type
          const { setPageType } = useExtensionState()
          const { setPageFilter } = useHistory()
          setPageType(pageType)
          setPageFilter(pageType)
          logger.debug(`History filter set for page type: ${pageType}`)
        } else {
          logger.info('Extension is disabled, skipping initialization.')
        }
      })
    },
    () => {
      // Clean up the extension when neither page is visible
      logger.debug('Page hidden - cleaning up extension...')
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
