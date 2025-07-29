import { createApp } from 'vue'
import BetterHistory from './components/BetterHistoryBtn.vue'
import HistoryPane from './components/HistoryPane.vue'
import { parseCodeMirrorHtml } from './htmlParser'
import { history } from './state'

/**
 * Waits for an element to appear in the DOM.
 * @param selector The CSS selector of the element.
 * @param timeout The maximum time to wait in milliseconds.
 * @returns A promise that resolves with the element, or null if it times out.
 */
function waitForElement(selector: string, timeout = 15000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector)
    if (el) {
      resolve(el)
      return
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) {
        observer.disconnect()
        resolve(el)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
  })
}

// Main function
;(async function () {
  console.log('contentScript is running')

  const topBar = await waitForElement('.toolbar')
  if (topBar) {
    const buttonContainer = document.createElement('div')
    buttonContainer.id = 'better-history-button-container'
    topBar.insertBefore(buttonContainer, topBar.children[1])
    createApp(BetterHistory).mount('#better-history-button-container')
  }

  const graphiqlContainer = await waitForElement('.graphiql-container')
  if (graphiqlContainer) {
    const paneContainer = document.createElement('div')
    paneContainer.id = 'better-history-pane-container'
    const lastPosition = graphiqlContainer.children.length - 1
    graphiqlContainer.insertBefore(paneContainer, graphiqlContainer.children[lastPosition])
    createApp(HistoryPane).mount('#better-history-pane-container')
  }

  const executeButton = await waitForElement('.execute-button')
  if (executeButton) {
    executeButton.addEventListener('click', () => {
      const parsed = parseCodeMirrorHtml()
      if (parsed) {
        history.value.unshift({
          id: crypto.randomUUID(),
          ...parsed,
          createdAt: new Date().toISOString(),
        })
      }
    })
  }
})()
