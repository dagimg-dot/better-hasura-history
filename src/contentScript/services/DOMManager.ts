import type { PageType } from './NavigationManager'

/**
 * Manages DOM manipulation operations for the Better Hasura History extension.
 * Handles creation and cleanup of extension UI containers.
 */
export class DOMManager {
  private static readonly BUTTON_CONTAINER_ID = 'better-history-button-container'
  private static readonly PANE_CONTAINER_ID = 'better-history-pane-container'

  private pageType: PageType
  private buttonContainerEl: Element | null = null
  private paneContainerEl: Element | null = null

  constructor(
    private readonly container: Element,
    pageType: PageType,
  ) {
    this.pageType = pageType
  }

  /**
   * Set separate container elements for button and pane (used for GraphiQL)
   */
  setContainers(buttonContainer: Element, paneContainer: Element): void {
    this.buttonContainerEl = buttonContainer
    this.paneContainerEl = paneContainer
  }

  /**
   * Create and insert the button container into the toolbar (GraphiQL) or near Database dropdown (SQL).
   */
  createButtonContainer(): HTMLDivElement {
    // Remove existing container if it exists
    this.removeButtonContainer()

    const container = document.createElement('div')
    container.id = DOMManager.BUTTON_CONTAINER_ID

    if (this.pageType === 'graphiql') {
      // Use stored button container element if available (passed from main.ts)
      if (this.buttonContainerEl) {
        // Insert at position 1 (after prettify button), same as original behavior
        const toolbar = this.buttonContainerEl as Element
        const insertPosition = Math.min(1, toolbar.children.length)
        const referenceElement = toolbar.children[insertPosition]

        if (referenceElement) {
          toolbar.insertBefore(container, referenceElement)
        } else {
          toolbar.appendChild(container)
        }
        return container
      }
      // Fallback: use container
      const toolbar = this.container as Element
      const insertPosition = Math.min(1, toolbar.children.length)
      const referenceElement = toolbar.children[insertPosition]

      if (referenceElement) {
        toolbar.insertBefore(container, referenceElement)
      } else {
        toolbar.appendChild(container)
      }
    } else if (this.pageType === 'sql') {
      // For SQL page, wrap the database select and button in a flex container
      const dataSourceSelect = document.querySelector(
        'select[name="data-source"]',
      ) as HTMLSelectElement

      if (dataSourceSelect) {
        // Find the column that contains the database dropdown (col-xs-8)
        let columnEl: Element | null = dataSourceSelect
        while (columnEl && !columnEl.classList.contains('col-xs-8')) {
          columnEl = columnEl.parentElement
        }

        if (columnEl && columnEl.children.length > 0) {
          // Get the select wrapper (second child - index 1)
          const selectWrapper = columnEl.children[1]

          if (selectWrapper) {
            // Create a flex wrapper for select and button
            const flexWrapper = document.createElement('div')
            flexWrapper.style.display = 'flex'
            flexWrapper.style.flexDirection = 'row'
            flexWrapper.style.alignItems = 'center'
            flexWrapper.style.gap = '13px'

            // Replace select wrapper with flex wrapper
            columnEl.replaceChild(flexWrapper, selectWrapper)

            // Add select wrapper to flex wrapper
            flexWrapper.appendChild(selectWrapper)

            // Set button container styles
            container.style.margin = '0'

            // Add button container to flex wrapper after select
            flexWrapper.appendChild(container)
          }
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
      // Use stored pane container element if available (passed from main.ts)
      if (this.paneContainerEl) {
        // Insert at position 1 (same as original behavior - before explorer pane)
        const graphiqlContainer = this.paneContainerEl as Element
        const insertPosition = Math.min(1, graphiqlContainer.children.length)
        const referenceElement = graphiqlContainer.children[insertPosition]

        if (referenceElement) {
          graphiqlContainer.insertBefore(container, referenceElement)
        } else {
          graphiqlContainer.appendChild(container)
        }
        return container
      }
      // Fallback: use container
      const graphiqlContainer = this.container as Element
      const lastPosition = Math.max(0, graphiqlContainer.children.length - 1)
      const referenceElement = graphiqlContainer.children[lastPosition]

      if (referenceElement) {
        graphiqlContainer.insertBefore(container, referenceElement)
      } else {
        graphiqlContainer.appendChild(container)
      }
    } else if (this.pageType === 'sql') {
      // For SQL page, we need to wrap both pane and editor in a flex container
      const sqlEditor = document.getElementById('raw_sql')

      if (sqlEditor) {
        // Find the direct child of col-xs-10 that contains the editor
        let columnEl: Element | null = sqlEditor
        while (columnEl && !columnEl.classList.contains('col-xs-10')) {
          columnEl = columnEl.parentElement
        }

        if (columnEl && columnEl.children.length > 0) {
          // Get the first child (editor wrapper)
          const editorWrapper = columnEl.children[0]

          // Create a flex wrapper
          const flexWrapper = document.createElement('div')
          flexWrapper.style.display = 'flex'
          flexWrapper.style.flexDirection = 'row'
          flexWrapper.style.width = '100%'
          flexWrapper.style.alignItems = 'flex-start'
          flexWrapper.style.gap = '20px'

          // Replace the editor wrapper with our flex wrapper
          columnEl.replaceChild(flexWrapper, editorWrapper)

          // Add the editor wrapper to the flex wrapper
          flexWrapper.appendChild(editorWrapper)

          // Set editor wrapper to take remaining space
          editorWrapper.style.flex = '1'
          editorWrapper.style.minWidth = '0'

          // Set pane styles
          container.style.flex = '0 0 280px'
          container.style.minWidth = '280px'
          container.style.maxWidth = '280px'
          container.style.alignSelf = 'flex-start'
          container.style.marginTop = '20px'
          container.style.height = sqlEditor.style.height || '285px'

          // Add pane to the flex wrapper
          flexWrapper.insertBefore(container, editorWrapper)

          // Sync pane height with editor height using ResizeObserver
          const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
              container.style.height = `${entry.contentRect.height}px`
            }
          })
          resizeObserver.observe(sqlEditor)
        }
      }
      // Fallback
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
