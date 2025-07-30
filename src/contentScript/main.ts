import { App, createApp } from 'vue'
import BetterHistory from './components/BetterHistoryBtn.vue'
import HistoryPane from './components/HistoryPane.vue'
import { parseCodeMirrorHtml } from './utils/htmlParser'
import { ParsedQuery } from './types'
import { history } from './state'

class BetterHasuraHistory {
  toolBar: Element
  graphiqlContainer: Element
  executeButton: Element
  buttonApp: App | null = null
  paneApp: App | null = null
  originalHistoryButton: HTMLElement | null = null

  constructor(toolBar: Element, graphiqlContainer: Element, executeButton: Element) {
    this.toolBar = toolBar
    this.graphiqlContainer = graphiqlContainer
    this.executeButton = executeButton
  }

  init(initialSettings: { showOriginalHistory: boolean }) {
    const buttonContainer = document.createElement('div')
    buttonContainer.id = 'better-history-button-container'
    this.toolBar.insertBefore(buttonContainer, this.toolBar.children[1])
    this.buttonApp = createApp(BetterHistory)
    this.buttonApp.mount('#better-history-button-container')

    const paneContainer = document.createElement('div')
    paneContainer.id = 'better-history-pane-container'
    const lastPosition = this.graphiqlContainer.children.length - 1
    this.graphiqlContainer.insertBefore(
      paneContainer,
      this.graphiqlContainer.children[lastPosition],
    )
    this.paneApp = createApp(HistoryPane)
    this.paneApp.mount('#better-history-pane-container')

    this.executeButton.addEventListener('click', this.handleExecuteClick)

    // Attempt to find the original history button.
    this.originalHistoryButton = this.toolBar.querySelector('.toolbar-button[title="Show History"]')
    this.toggleOriginalHistory(initialSettings.showOriginalHistory)
  }

  destroy() {
    if (this.buttonApp) {
      this.buttonApp.unmount()
      document.getElementById('better-history-button-container')?.remove()
      this.buttonApp = null
    }

    if (this.paneApp) {
      this.paneApp.unmount()
      document.getElementById('better-history-pane-container')?.remove()
      this.paneApp = null
    }

    this.executeButton.removeEventListener('click', this.handleExecuteClick)

    // Restore the original history button's visibility
    this.toggleOriginalHistory(true)
    this.originalHistoryButton = null
  }

  toggleOriginalHistory(visible: boolean) {
    if (this.originalHistoryButton) {
      this.originalHistoryButton.style.display = visible ? '' : 'none'
    }
  }

  private handleExecuteClick = () => {
    const parsed = parseCodeMirrorHtml()
    if (!parsed) return

    this.addNewHistoryEntry(parsed)
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
