import { logger } from '../utils/logger'

export class SqlLayoutHelper {
  private resizeObserver: ResizeObserver | null = null

  wrapEditorWithPane(sqlEditor: HTMLElement, paneContainer: HTMLElement): void {
    const columnEl = this.findParentByClass(sqlEditor, 'col-xs-10')
    if (!columnEl || columnEl.children.length === 0) {
      logger.warn('SQL: Column element not found or has no children')
      return
    }

    const editorWrapper = columnEl.children[0] as HTMLElement
    const flexWrapper = document.createElement('div')
    flexWrapper.style.display = 'flex'
    flexWrapper.style.flexDirection = 'row'
    flexWrapper.style.width = '100%'
    flexWrapper.style.alignItems = 'flex-start'
    flexWrapper.style.gap = '20px'

    columnEl.replaceChild(flexWrapper, editorWrapper)
    flexWrapper.appendChild(editorWrapper)

    editorWrapper.style.flex = '1'
    editorWrapper.style.minWidth = '0'

    paneContainer.style.flex = '0 0 280px'
    paneContainer.style.minWidth = '280px'
    paneContainer.style.maxWidth = '280px'
    paneContainer.style.alignSelf = 'flex-start'
    paneContainer.style.marginTop = '20px'
    paneContainer.style.height = sqlEditor.style.height || '285px'

    flexWrapper.insertBefore(paneContainer, editorWrapper)

    this.startResizeObserver(sqlEditor, paneContainer)
  }

  private startResizeObserver(editor: HTMLElement, pane: HTMLElement): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        pane.style.height = `${entry.contentRect.height}px`
      }
    })
    this.resizeObserver.observe(editor)
  }

  wrapSelectWithButton(dataSourceSelect: HTMLSelectElement, buttonContainer: HTMLElement): void {
    let columnEl = dataSourceSelect.parentElement
    while (columnEl && !columnEl.classList.contains('col-xs-8')) {
      columnEl = columnEl.parentElement
    }

    if (!columnEl || columnEl.children.length < 2) return

    const selectWrapper = columnEl.children[1] as HTMLElement
    if (!selectWrapper) return

    const flexWrapper = document.createElement('div')
    flexWrapper.style.display = 'flex'
    flexWrapper.style.flexDirection = 'row'
    flexWrapper.style.alignItems = 'center'
    flexWrapper.style.gap = '13px'

    columnEl.replaceChild(flexWrapper, selectWrapper)
    flexWrapper.appendChild(selectWrapper)

    buttonContainer.style.margin = '0'
    flexWrapper.appendChild(buttonContainer)
  }

  cleanup(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  }

  private findParentByClass(element: Element, className: string): HTMLElement | null {
    let current: Element | null = element
    while (current && !current.classList.contains(className)) {
      current = current.parentElement
    }
    return current as HTMLElement | null
  }
}
