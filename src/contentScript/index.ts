import {
  ExtensionLifecycleManager,
  NavigationManager,
  RouteManager,
  SearchInputManager,
  SettingsManager,
} from './services'
import { logger } from './utils/logger'
import type { PageType } from './services/NavigationManager'
import { useExtensionState } from './composables/useExtensionState'
import { useHistory } from './composables/useHistory'
import { TableSearch } from './components/table'

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

let tableSearchInjected = false
let currentRoute: string = 'unknown'

const searchInputManager = new SearchInputManager()

function setupGlobalShortcut(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      searchInputManager.focus()
    }
  })
}

function resetTableSearchState(): void {
  tableSearchInjected = false
  currentRoute = 'unknown'
}

async function injectTableSearch(): Promise<void> {
  const pageInfo = RouteManager.getPageInfo()
  
  if (pageInfo.route === 'data' || pageInfo.route === 'sql') {
    if (pageInfo.route !== currentRoute) {
      currentRoute = pageInfo.route
      tableSearchInjected = false
    }
  }
  
  if (tableSearchInjected) return

  const tableLinks = document.querySelector('[data-test="table-links"]')
  if (!tableLinks) {
    logger.debug('Table links element not found, waiting...')
    return
  }

  const parent = tableLinks.parentElement
  if (!parent) return

  const existingSearch = parent.querySelector('.table-search-container')
  if (existingSearch) {
    tableSearchInjected = true
    return
  }

  try {
    const dbSection = parent.querySelector('.P72YYDnHxrZnFQaKXXUxI')

    const wrapper = document.createElement('div')
    wrapper.className = 'bhh-table-search-wrapper'
    wrapper.style.display = 'flex'
    wrapper.style.flexDirection = 'column'

    if (dbSection && dbSection.parentElement === parent) {
      parent.insertBefore(wrapper, tableLinks)
      wrapper.appendChild(dbSection)
    } else {
      parent.insertBefore(wrapper, tableLinks)
    }

    const searchContainer = document.createElement('div')
    searchContainer.className = 'table-search-container'
    wrapper.appendChild(searchContainer)

    const vueApp = document.createElement('div')
    searchContainer.appendChild(vueApp)

    const { createApp } = await import('vue')
    const app = createApp(TableSearch)
    app.mount(vueApp)

    tableSearchInjected = true
    logger.debug('Table search injected successfully')
  } catch (error) {
    logger.error('Failed to inject table search', error as Error)
  }
}

function setupTableSearchObserver(): void {
  const observer = new MutationObserver(() => {
    const pageInfo = RouteManager.getPageInfo()
    if (pageInfo.route === 'data' || pageInfo.route === 'sql') {
      injectTableSearch()
    } else if (currentRoute !== 'unknown') {
      resetTableSearchState()
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

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

  setupGlobalShortcut()

  const pageInfo = RouteManager.getPageInfo()
  if (pageInfo.route === 'data' || pageInfo.route === 'sql') {
    injectTableSearch()
  }

  setupTableSearchObserver()
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
