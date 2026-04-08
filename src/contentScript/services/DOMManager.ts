import type { PageStrategy } from '../strategies/PageStrategy'

export class DOMManager {
  private static readonly BUTTON_CONTAINER_ID = 'better-history-button-container'
  private static readonly PANE_CONTAINER_ID = 'better-history-pane-container'

  private buttonContainerEl: Element | null = null
  private paneContainerEl: Element | null = null

  constructor(
    private readonly container: Element,
    private readonly strategy: PageStrategy,
  ) {}

  setContainers(buttonContainer: Element, paneContainer: Element): void {
    this.buttonContainerEl = buttonContainer
    this.paneContainerEl = paneContainer
  }

  createButtonContainer(strategy: PageStrategy): HTMLDivElement {
    this.removeButtonContainer()
    const container = document.createElement('div')
    container.id = DOMManager.BUTTON_CONTAINER_ID

    if (strategy.pageType === 'graphiql') {
      if (this.buttonContainerEl) {
        const position = strategy.getButtonInsertPosition(this.buttonContainerEl)
        if (position) {
          this.buttonContainerEl.insertBefore(container, position)
        } else {
          this.buttonContainerEl.appendChild(container)
        }
        return container
      }
      const position = strategy.getButtonInsertPosition(this.container)
      if (position) {
        this.container.insertBefore(container, position)
      } else {
        this.container.appendChild(container)
      }
    }

    return container
  }

  createPaneContainer(strategy: PageStrategy): HTMLDivElement {
    this.removePaneContainer()
    const container = document.createElement('div')
    container.id = DOMManager.PANE_CONTAINER_ID

    if (strategy.pageType === 'graphiql') {
      if (this.paneContainerEl) {
        const position = strategy.getPaneInsertPosition(this.paneContainerEl)
        if (position) {
          this.paneContainerEl.insertBefore(container, position)
        } else {
          this.paneContainerEl.appendChild(container)
        }
        return container
      }
      const position = strategy.getPaneInsertPosition(this.container)
      if (position) {
        this.container.insertBefore(container, position)
      } else {
        this.container.appendChild(container)
      }
    }

    if (!container.parentElement) {
      this.container.appendChild(container)
    }

    return container
  }

  createPrettifyButton(): HTMLButtonElement | null {
    const titleEl = document.getElementById('variable-editor-title')
    if (!titleEl) return null

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
    button.style.setProperty(
      'font-family',
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'important',
    )
    button.style.setProperty('font-weight', '400', 'important')
    button.style.setProperty('text-shadow', 'none', 'important')
    button.style.setProperty('color', '#555555', 'important')

    button.addEventListener('mousedown', (e) => e.stopPropagation())
    titleEl.appendChild(button)
    return button
  }

  findOriginalHistoryButton(): HTMLElement | null {
    return this.container.querySelector('.toolbar-button[title="Show History"]') as HTMLElement
  }

  removeButtonContainer(): void {
    document.getElementById(DOMManager.BUTTON_CONTAINER_ID)?.remove()
  }

  removePaneContainer(): void {
    document.getElementById(DOMManager.PANE_CONTAINER_ID)?.remove()
  }

  cleanup(): void {
    this.removeButtonContainer()
    this.removePaneContainer()
  }
}
