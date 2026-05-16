import type { PageType } from '@/shared/types/services'

export interface EditorContent {
  query?: string
  operation?: string
  variables?: string
  operation_name: string
}

export interface SqlContent {
  sql?: string
  operation_name: string
}

export type ParsedContent = EditorContent | SqlContent

export interface HistoryItemData {
  operationName: string
  query: string
  variables?: Record<string, any>
  operationType: 'query' | 'mutation' | 'subscription' | 'sql'
}

export interface PageStrategy {
  readonly pageType: PageType
  readonly editorType: 'codemirror' | 'ace'

  getRequiredSelectors(): string[]
  getButtonInsertPosition(container: Element): Element | null
  getPaneInsertPosition(container: Element): Element | null

  getRunButtonSelector(): string | null
  getExecuteMessageType(): string

  getLayoutSetupHandler():
    | ((buttonContainer: HTMLElement, paneContainer: HTMLElement) => void)
    | null

  shouldToggleOriginalHistory(): boolean

  createButtonElement(): HTMLDivElement
  createPaneElement(): HTMLDivElement

  getHistoryItemData(content: ParsedContent): HistoryItemData
  getMessageTypes(): {
    getContent: string
    contentResponse: string
    applyHistory: string
  }
}
