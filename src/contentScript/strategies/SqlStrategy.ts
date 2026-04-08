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
      operationName: sqlContent.operationName,
      query: sqlContent.sql,
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
