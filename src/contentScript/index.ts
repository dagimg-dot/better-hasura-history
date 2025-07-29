import { createApp } from 'vue'
import BetterHistory from './components/BetterHistoryBtn.vue'
import HistoryPane from './components/HistoryPane.vue'
import type { ParsedQuery } from './types'
import { history } from './state'
import { parseCodeMirrorHtml } from './utils/htmlParser'
import { waitForElement } from './utils/waitForElement'

const checkForDuplicate = (parsed: ParsedQuery) => {
  const { operation_name: baseName, operation, variables } = parsed

  // Find all entries that are related to the base operation name.
  const relatedEntries = history.value.filter(
    (entry) => entry.operation_name === baseName || entry.operation_name.startsWith(baseName + '_'),
  )

  // Check if an identical operation already exists.
  const isDuplicate = relatedEntries.some(
    (entry) => entry.operation === operation && entry.variables === variables,
  )

  if (isDuplicate) {
    return
  }

  // Determine the new name for the history entry.
  let newName = baseName
  const baseNameExists = relatedEntries.some((entry) => entry.operation_name === baseName)

  if (baseNameExists) {
    let suffix = 1
    while (relatedEntries.some((entry) => entry.operation_name === `${baseName}_${suffix}`)) {
      suffix++
    }
    newName = `${baseName}_${suffix}`
  }

  return { newName, operation, variables }
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
      if (!parsed) return

      const newEntry = checkForDuplicate(parsed)

      if (!newEntry) return

      history.value.unshift({
        id: crypto.randomUUID(),
        operation_name: newEntry.newName,
        operation: newEntry.operation,
        variables: newEntry.variables,
        createdAt: new Date().toISOString(),
      })
    })
  }
})()
