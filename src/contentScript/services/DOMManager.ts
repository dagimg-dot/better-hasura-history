import type { PageType } from './NavigationManager'

/**
 * Manages DOM manipulation operations for the Better Hasura History extension.
 * Handles creation and cleanup of extension UI containers.
 */
export class DOMManager {
  private static readonly BUTTON_CONTAINER_ID = 'better-history-button-container'
  private static readonly PANE_CONTAINER_ID = 'better-history-pane-container'

  private pageType: PageType

  constructor(
    private readonly container: Element,
    pageType: PageType,
  ) {
    this.pageType = pageType
  }

  /**
   * Create and insert the button container into the toolbar (GraphiQL) or near Run button (SQL).
   */
  createButtonContainer(): HTMLDivElement {
    // Remove existing container if it exists
    this.removeButtonContainer()

    const container = document.createElement('div')
    container.id = DOMManager.BUTTON_CONTAINER_ID

    if (this.pageType === 'graphiql') {
      const toolbar = this.container as Element
      // Insert after the first child (after the prettify button)
      const insertPosition = Math.min(1, toolbar.children.length)
      const referenceElement = toolbar.children[insertPosition]

      if (referenceElement) {
        toolbar.insertBefore(container, referenceElement)
      } else {
        toolbar.appendChild(container)
      }
    } else if (this.pageType === 'sql') {
      // For SQL page, find the Run button's parent and insert the button next to it
      const runButton = document.querySelector('[data-test="run-sql"]') as HTMLElement
      if (runButton) {
        const parent = runButton.parentElement
        if (parent) {
          parent.insertBefore(container, runButton)
        }
      }
    }

    return container
  }

  /**
   * Create and insert the pane container into the GraphiQL container or SQL page.
   */
  createPaneContainer(): HTMLDivElement {
    // Remove existing container if it exists
    this.removePaneContainer()

    const container = document.createElement('div')
    container.id = DOMManager.PANE_CONTAINER_ID

    if (this.pageType === 'graphiql') {
      const graphiqlContainer = this.container as Element
      // Insert before the last child (explorer pane)
      const lastPosition = Math.max(0, graphiqlContainer.children.length - 1)
      const referenceElement = graphiqlContainer.children[lastPosition]

      if (referenceElement) {
        graphiqlContainer.insertBefore(container, referenceElement)
      } else {
        graphiqlContainer.appendChild(container)
      }
    } else if (this.pageType === 'sql') {
      // For SQL page, we need to find the right structure
      // Looking at the HTML, there's a div with class "_1yn2Hu_FpcuAMsFTAk5-Fq" that contains everything
      // We want to add a pane to the right of the SQL editor
      const rootContainer = document.querySelector('.rZwcGpymS1jusCiXDYcLo') as HTMLElement
      if (rootContainer) {
        // Find the main content area and insert after the SQL editor section
        const sqlEditorSection = rootContainer.querySelector('._4_8EK7RlaQT8JQZ_hBhjj')
        if (sqlEditorSection) {
          const children = sqlEditorSection.children
          // Insert after all current children to create a right pane
          for (let i = 0; i < children.length; i++) {
            const child = children[i]
            const classes = child.className || ''
            if (classes.includes('col-xs-8') && classes.includes('_1GPRhKMAouUv16NYEc4Dwr')) {
              // This is likely the SQL editor column - insert after it
              sqlEditorSection.insertBefore(container, child.nextSibling)
              break
            }
          }
        }
      }
      // Fallback: just append to container if no suitable insertion point found
      if (!container.parentElement) {
        ;(this.container as Element).appendChild(container)
      }
    }

    return container
  }

  /**
   * Create and insert the prettify variables button into the variable editor title.
   */
  createPrettifyButton(): HTMLButtonElement | null {
    const titleEl = document.getElementById('variable-editor-title')
    if (!titleEl) return null

    // Check if button already exists
    const existingBtn = titleEl.querySelector('.bhh-prettify-btn')
    if (existingBtn) return existingBtn as HTMLButtonElement

    titleEl.style.display = 'flex'
    titleEl.style.alignItems = 'center'
    titleEl.style.justifyContent = 'space-between'
    titleEl.style.padding = '6px 8px 8px 43px'

    const button = document.createElement('button')
    button.style.all = 'unset'
    button.style.display = 'flex'
    button.style.alignItems = 'center'
    button.style.justifyContent = 'center'
    button.className = 'bhh-prettify-btn'
    button.textContent = 'Prettify'
    button.title = 'Format JSON variables'
    button.style.marginLeft = '10px'
    button.style.cursor = 'pointer'
    button.style.fontSize = '12px'
    button.style.border = '1px solid #c3c3c3'
    button.style.borderRadius = '3px'
    button.style.background = '#f3f3f3'
    button.style.padding = '2px 5px'
    button.style.textTransform = 'none'
    button.style.fontVariant = 'normal'
    // Override GraphiQL styles: avoid bold, shadow, emboss; match clean dark-theme look.
    button.style.setProperty(
      'font-family',
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'important',
    )
    button.style.setProperty('font-weight', '400', 'important')
    button.style.setProperty('text-shadow', 'none', 'important')
    button.style.setProperty('color', '#555555', 'important')

    // Stop propagation on mousedown to prevent parent resize/collapse behavior
    button.addEventListener('mousedown', (e) => {
      e.stopPropagation()
    })

    titleEl.appendChild(button)
    return button
  }

  /**
   * Find and return the original history button element.
   */
  findOriginalHistoryButton(): HTMLElement | null {
    if (this.pageType === 'graphiql') {
      const toolbar = this.container as Element
      return toolbar.querySelector('.toolbar-button[title="Show History"]') as HTMLElement
    }
    return null
  }

  /**
   * Remove the button container from the DOM.
   */
  removeButtonContainer(): void {
    document.getElementById(DOMManager.BUTTON_CONTAINER_ID)?.remove()
  }

  /**
   * Remove the pane container from the DOM.
   */
  removePaneContainer(): void {
    document.getElementById(DOMManager.PANE_CONTAINER_ID)?.remove()
  }

  /**
   * Clean up all created DOM elements.
   */
  cleanup(): void {
    this.removeButtonContainer()
    this.removePaneContainer()
  }

  /**
   * Get the container element.
   */
  get containerElement(): Element {
    return this.container
  }
}
