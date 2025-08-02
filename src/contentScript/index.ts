import { logger } from './utils/logger'
import { ExtensionLifecycleManager, SettingsManager } from './services'

// Inject the bridge script into the main page context
const script = document.createElement('script')
script.src = chrome.runtime.getURL('src/contentScript/main-world.js')
script.type = 'module'
;(document.head || document.documentElement).prepend(script)

// Single instance of the lifecycle manager
const lifecycleManager = new ExtensionLifecycleManager()

/**
 * Initialize the extension with the provided settings.
 */
async function initialize(
  settings?: ReturnType<typeof SettingsManager.mergeSettings>,
): Promise<void> {
  try {
    await lifecycleManager.initialize(settings)
  } catch (error) {
    logger.error('Failed to initialize extension', error)
  }
}

/**
 * Destroy the extension instance.
 */
function destroy(): void {
  lifecycleManager.cleanup()
}

// Initial load: Read settings and initialize if enabled.
SettingsManager.getSettings()
  .then((settings) => {
    if (settings.extensionEnabled) {
      logger.info('Extension enabled on startup - initializing...')
      initialize(settings)
    } else {
      logger.info('Extension disabled on startup - skipping initialization')
    }
  })
  .catch((error) => {
    logger.error('Failed to load initial settings', error)
  })

// Listen for changes from the popup.
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace !== 'local' || !changes.settings) {
    return
  }

  try {
    const { oldValue, newValue } = changes.settings
    const oldSettings = SettingsManager.mergeSettings(oldValue)
    const newSettings = SettingsManager.mergeSettings(newValue)

    logger.info('Settings changed:', { oldSettings, newSettings })

    // Delegate settings change handling to the lifecycle manager
    await lifecycleManager.handleSettingsChange(oldValue, newValue)
  } catch (error) {
    logger.error('Error handling settings change', error)
  }
})
