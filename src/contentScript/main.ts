import { createApp } from 'vue'
import BetterHistory from './components/BetterHistoryBtn.vue'
import HistoryPane from './components/HistoryPane.vue'
import { parseCodeMirrorHtml } from './utils/htmlParser'
import { ParsedQuery } from './types'
import { history } from './state'

class BetterHasuraHistory {
  toolBar: Element
  graphiqlContainer: Element
  executeButton: Element

  constructor(toolBar: Element, graphiqlContainer: Element, executeButton: Element) {
    this.toolBar = toolBar
    this.graphiqlContainer = graphiqlContainer
    this.executeButton = executeButton
  }

  init() {
    const buttonContainer = document.createElement('div')
    buttonContainer.id = 'better-history-button-container'
    this.toolBar.insertBefore(buttonContainer, this.toolBar.children[1])
    createApp(BetterHistory).mount('#better-history-button-container')

    const paneContainer = document.createElement('div')
    paneContainer.id = 'better-history-pane-container'
    const lastPosition = this.graphiqlContainer.children.length - 1
    this.graphiqlContainer.insertBefore(
      paneContainer,
      this.graphiqlContainer.children[lastPosition],
    )
    createApp(HistoryPane).mount('#better-history-pane-container')

    this.executeButton.addEventListener('click', () => {
      const parsed = parseCodeMirrorHtml()
      if (!parsed) return

      this.addNewHistoryEntry(parsed)
    })
  }

  addNewHistoryEntry(parsed: ParsedQuery) {
    const newEntry = this.prepareNewHistoryEntry(parsed)

    if (!newEntry) return

    history.value.unshift({
      id: crypto.randomUUID(),
      operation_name: newEntry.newName,
      operation: newEntry.operation,
      variables: newEntry.variables,
      createdAt: new Date().toISOString(),
    })
  }

  prepareNewHistoryEntry(parsed: ParsedQuery) {
    const { operation_name: baseName, operation, variables } = parsed

    // Find all entries that are related to the base operation name.
    const relatedEntries = history.value.filter(
      (entry) =>
        entry.operation_name === baseName || entry.operation_name.startsWith(baseName + '_'),
    )

    // Check if an identical operation already exists.
    const isDuplicate = relatedEntries.some(
      (entry) => entry.operation === operation && entry.variables === variables,
    )

    if (isDuplicate) {
      return
    }

    // Determine the new name for the history entry.
    const existingNames = new Set(relatedEntries.map((entry) => entry.operation_name))
    let newName = baseName

    if (existingNames.has(baseName)) {
      let suffix = 1
      while (existingNames.has(`${baseName}_${suffix}`)) {
        suffix++
      }
      newName = `${baseName}_${suffix}`
    }

    return { newName, operation, variables }
  }
}

export default BetterHasuraHistory
