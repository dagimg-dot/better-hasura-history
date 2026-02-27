/**
 * Manages DOM manipulation operations for the Better Hasura History extension.
 * Handles creation and cleanup of extension UI containers.
 */
export class DOMManager {
  private static readonly BUTTON_CONTAINER_ID = 'better-history-button-container'
  private static readonly PANE_CONTAINER_ID = 'better-history-pane-container'

  constructor(
    private readonly toolbar: Element,
    private readonly graphiqlContainer: Element,
  ) {}

  /**
   * Create and insert the button container into the toolbar.
   */
  createButtonContainer(): HTMLDivElement {
    // Remove existing container if it exists
    this.removeButtonContainer()

    const container = document.createElement('div')
    container.id = DOMManager.BUTTON_CONTAINER_ID

    // Insert after the first child (after the prettify button)
    const insertPosition = Math.min(1, this.toolbar.children.length)
    const referenceElement = this.toolbar.children[insertPosition]

    if (referenceElement) {
      this.toolbar.insertBefore(container, referenceElement)
    } else {
      this.toolbar.appendChild(container)
    }

    return container
  }

  /**
   * Create and insert the pane container into the GraphiQL container.
   */
  createPaneContainer(): HTMLDivElement {
    // Remove existing container if it exists
    this.removePaneContainer()

    const container = document.createElement('div')
    container.id = DOMManager.PANE_CONTAINER_ID

    // Insert before after the explorer pane
    const lastPosition = Math.max(0, this.graphiqlContainer.children.length - 1)
    const referenceElement = this.graphiqlContainer.children[lastPosition]

    if (referenceElement) {
      this.graphiqlContainer.insertBefore(container, referenceElement)
    } else {
      this.graphiqlContainer.appendChild(container)
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
    return this.toolbar.querySelector('.toolbar-button[title="Show History"]') as HTMLElement
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
   * Get the toolbar element.
   */
  get toolbarElement(): Element {
    return this.toolbar
  }

  /**
   * Get the GraphiQL container element.
   */
  get graphiqlContainerElement(): Element {
    return this.graphiqlContainer
  }
}
