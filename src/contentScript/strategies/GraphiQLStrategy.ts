import type { PageType } from '@/shared/types/services'
import { OPERATION_TYPES } from '@/shared/constants'
import type { PageStrategy, EditorContent, ParsedContent, HistoryItemData } from './PageStrategy'

export class GraphiQLStrategy implements PageStrategy {
  readonly pageType: PageType = 'graphiql'
  readonly editorType = 'codemirror' as const

  getRequiredSelectors(): string[] {
    return ['.toolbar', '.graphiql-container', '.execute-button']
  }

  getButtonInsertPosition(container: Element): Element | null {
    const insertPosition = Math.min(1, container.children.length)
    return container.children[insertPosition] || null
  }

  getPaneInsertPosition(container: Element): Element | null {
    const insertPosition = Math.min(1, container.children.length)
    return container.children[insertPosition] || null
  }

  getRunButtonSelector(): string | null {
    return '.execute-button'
  }

  getExecuteMessageType(): string {
    return 'BHH_GET_EDITOR_CONTENT'
  }

  getLayoutSetupHandler():
    | ((buttonContainer: HTMLElement, paneContainer: HTMLElement) => void)
    | null {
    return null
  }

  shouldToggleOriginalHistory(): boolean {
    return true
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

  getHistoryItemData(content: ParsedContent): HistoryItemData {
    const editorContent = content as EditorContent
    const trimmed = (editorContent.query || editorContent.operation || '').trim().toLowerCase()
    let operationType: 'query' | 'mutation' | 'subscription' = OPERATION_TYPES.QUERY
    if (trimmed.startsWith(OPERATION_TYPES.MUTATION)) operationType = OPERATION_TYPES.MUTATION
    else if (trimmed.startsWith(OPERATION_TYPES.SUBSCRIPTION))
      operationType = OPERATION_TYPES.SUBSCRIPTION

    let variables: Record<string, any> = {}
    if (editorContent.variables) {
      try {
        variables = JSON.parse(editorContent.variables)
      } catch {
        variables = {}
      }
    }

    return {
      operationName: editorContent.operation_name,
      query: editorContent.query || editorContent.operation || '',
      variables,
      operationType,
    }
  }

  getMessageTypes() {
    return {
      getContent: 'BHH_GET_EDITOR_CONTENT',
      contentResponse: 'BHH_EDITOR_CONTENT_RESPONSE',
      applyHistory: 'BHH_APPLY_HISTORY_ITEM',
    }
  }
}
