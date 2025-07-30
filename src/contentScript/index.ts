import { waitForElement } from './utils/waitForElement'
import BetterHasuraHistory from './main'
import { logger } from './utils/logger'

// Inject the bridge script into the main page context
const script = document.createElement('script')
script.src = chrome.runtime.getURL('src/contentScript/main-world.js')
script.type = 'module'
;(document.head || document.documentElement).prepend(script)

// --- Better Hasura History Lifecycle Management ---

let bhhInstance: BetterHasuraHistory | null = null

const defaultSettings = {
  extensionEnabled: true,
  showOriginalHistory: false,
}

async function initialize(settings: typeof defaultSettings) {
  if (bhhInstance) {
    logger.info('Better Hasura History is already initialized.')
    return
  }

  try {
    logger.info('Initializing Better Hasura History...')
    const toolbar = await waitForElement('.toolbar')
    const graphiqlContainer = await waitForElement('.graphiql-container')
    const executeButton = await waitForElement('.execute-button')

    if (!toolbar || !graphiqlContainer || !executeButton) {
      logger.error('Could not find all required elements on the page. Aborting.')
      return
    }

    logger.info('All required elements found. Initializing Better Hasura History...')
    bhhInstance = new BetterHasuraHistory(toolbar, graphiqlContainer, executeButton)
    bhhInstance.init({ showOriginalHistory: settings.showOriginalHistory })

    logger.info('Better Hasura History initialized successfully.')
  } catch (error) {
    logger.error('Initialization failed.', error)
    if (bhhInstance) {
      bhhInstance.destroy()
      bhhInstance = null
    }
  }
}

function destroy() {
  if (bhhInstance) {
    logger.info('Destroying Better Hasura History instance.')
    bhhInstance.destroy()
    bhhInstance = null
  }
}

// Initial load: Read settings and initialize if enabled.
chrome.storage.local.get(['settings'], (result) => {
  const settings = { ...defaultSettings, ...result.settings }
  if (settings.extensionEnabled) {
    initialize(settings)
  }
})

// Listen for changes from the popup.
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local' || !changes.settings) return

  const { oldValue, newValue } = changes.settings
  const oldSettings = { ...defaultSettings, ...oldValue }
  const newSettings = { ...defaultSettings, ...newValue }

  // Handle toggling the entire extension on/off
  if (oldSettings.extensionEnabled !== newSettings.extensionEnabled) {
    if (newSettings.extensionEnabled) {
      logger.info('Extension enabled. Initializing...')
      initialize(newSettings)
    } else {
      logger.info('Extension disabled. Destroying...')
      destroy()
    }
  }

  // Handle toggling the original history button visibility
  if (bhhInstance && oldSettings.showOriginalHistory !== newSettings.showOriginalHistory) {
    logger.info(`Toggling original history visibility to: ${newSettings.showOriginalHistory}`)
    bhhInstance.toggleOriginalHistory(newSettings.showOriginalHistory)
  }
})
