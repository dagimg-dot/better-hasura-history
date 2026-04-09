import type { PageType } from '../services/NavigationManager'
import type { HistoryItem } from '@/shared/types/history'
import type { PageStrategy, SqlContent, ParsedContent } from './PageStrategy'

export class SqlStrategy implements PageStrategy {
  readonly pageType: PageType = 'sql'
  readonly editorType = 'ace' as const

  getRequiredSelectors(): string[] {
    return ['#raw_sql', '[data-test="run-sql"]']
  }

  getButtonInsertPosition(container: Element): Element | null {
    return container
  }

  getPaneInsertPosition(container: Element): Element | null {
    return container
  }

  getRunButtonSelector(): string | null {
    return '[data-test="run-sql"]'
  }

  getExecuteMessageType(): string {
    return 'BHH_GET_SQL_CONTENT'
  }

  getLayoutSetupHandler():
    | ((buttonContainer: HTMLElement, paneContainer: HTMLElement) => void)
    | null {
    return (buttonContainer: HTMLElement, paneContainer: HTMLElement) => {
      const sqlEditor = document.getElementById('raw_sql') as HTMLElement | null
      const dataSourceSelect = document.querySelector(
        'select[name="data-source"]',
      ) as HTMLSelectElement | null

      if (sqlEditor && paneContainer) {
        this.wrapEditorWithPane(sqlEditor, paneContainer)
      }
      if (dataSourceSelect && buttonContainer) {
        this.wrapSelectWithButton(dataSourceSelect, buttonContainer)
      }
    }
  }

  private wrapEditorWithPane(sqlEditor: HTMLElement, paneContainer: HTMLElement): void {
    let columnEl: HTMLElement | null = sqlEditor.parentElement
    while (columnEl && !columnEl.classList.contains('col-xs-10')) {
      columnEl = columnEl.parentElement as HTMLElement | null
    }

    if (!columnEl || columnEl.children.length === 0) return

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

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        paneContainer.style.height = `${entry.contentRect.height}px`
      }
    })
    resizeObserver.observe(sqlEditor)
  }

  private wrapSelectWithButton(
    dataSourceSelect: HTMLSelectElement,
    buttonContainer: HTMLElement,
  ): void {
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

  shouldToggleOriginalHistory(): boolean {
    return false
  }

  createButtonElement(): HTMLDivElement {
    const container = document.createElement('div')
    container.id = 'better-history-button-container'
    return container
  }

  createPaneElement(): HTMLDivElement {
    const container = document.createElement('div')
    container.id = 'better-history-pane-container'
    return container
  }

  getHistoryItemData(content: ParsedContent): Partial<HistoryItem> {
    const sqlContent = content as SqlContent
    return {
      operationName: sqlContent.operation_name,
      query: sqlContent.sql || '',
      variables: undefined,
      operationType: 'sql',
    }
  }

  getMessageTypes() {
    return {
      getContent: 'BHH_GET_SQL_CONTENT',
      contentResponse: 'BHH_SQL_CONTENT_RESPONSE',
      applyHistory: 'BHH_APPLY_SQL_HISTORY_ITEM',
    }
  }
}
