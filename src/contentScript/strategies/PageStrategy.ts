import type { PageType } from '../services/NavigationManager'
import type { HistoryItem } from '@/shared/types/history'

export interface EditorContent {
  query: string
  variables?: string
  operationName: string
}

export interface SqlContent {
  sql: string
  operationName: string
}

export type ParsedContent = EditorContent | SqlContent

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

  getHistoryItemData(content: ParsedContent): Partial<HistoryItem>
  getMessageTypes(): {
    getContent: string
    contentResponse: string
    applyHistory: string
  }
}
