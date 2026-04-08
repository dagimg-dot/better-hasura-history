import { ExtensionLifecycleManager, NavigationManager, SettingsManager } from './services'
import { logger } from './utils/logger'
import type { PageType } from './services/NavigationManager'
import { useExtensionState } from './composables/useExtensionState'
import { useHistory } from './composables/useHistory'

const script = document.createElement('script')
script.src = chrome.runtime.getURL('src/contentScript/script-injector.js')
;(document.head || document.documentElement).prepend(script)

window.addEventListener('message', (event) => {
  if (event.source !== window) return

  const { type, data } = event.data
  if (type === 'BHH_EXPORT_HISTORY_REQUEST') {
    chrome.runtime.sendMessage({ type: 'BHH_DOWNLOAD_HISTORY', data })
  }
})

const lifecycleManager = new ExtensionLifecycleManager()

function initializeNavigation(): void {
  const navigationManager = new NavigationManager(
    document.body,
    (pageType: PageType) => {
      SettingsManager.getSettings().then((settings: any) => {
        if (settings.extensionEnabled) {
          lifecycleManager.initialize(pageType, settings).catch((error) => {
            logger.error('Failed to initialize extension on navigation', error as Error)
          })

          const { setPageType } = useExtensionState()
          const { setPageFilter } = useHistory()
          setPageType(pageType)
          setPageFilter(pageType)
        }
      })
    },
    () => {
      lifecycleManager.cleanup()
    },
  )

  navigationManager.start()
}

try {
  initializeNavigation()
} catch (error) {
  logger.error('Failed to start navigation manager', error as Error)
}

chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace !== 'local' || !changes.settings) return

  try {
    const { oldValue, newValue } = changes.settings
    await lifecycleManager.handleSettingsChange(oldValue, newValue)
  } catch (error) {
    logger.error('Error handling settings change', error as Error)
  }
})
