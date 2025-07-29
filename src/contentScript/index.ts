import { createApp } from 'vue'
import BetterHistory from './components/BetterHistoryBtn.vue'
import HistoryPane from './components/HistoryPane.vue'
import { parseCodeMirrorHtml } from './htmlParser'
import { history } from './state'

// Main function
;(async function () {
  console.log('contentScript is running')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  const topBar = document.querySelector('.toolbar')
  if (topBar) {
    const buttonContainer = document.createElement('div')
    buttonContainer.id = 'better-history-button-container'
    topBar.insertBefore(buttonContainer, topBar.children[1])
    createApp(BetterHistory).mount('#better-history-button-container')
  }

  const graphiqlContainer = document.querySelector('.graphiql-container')
  if (graphiqlContainer) {
    const paneContainer = document.createElement('div')
    paneContainer.id = 'better-history-pane-container'
    const lastPosition = graphiqlContainer.children.length - 1
    graphiqlContainer.insertBefore(paneContainer, graphiqlContainer.children[lastPosition])
    createApp(HistoryPane).mount('#better-history-pane-container')
  }

  const executeButton = document.querySelector('.execute-button')

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
