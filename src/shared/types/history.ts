export interface HistoryItem {
  id: string
  query: string
  variables?: Record<string, any>
  timestamp: number
  operationName?: string
  operationType: 'query' | 'mutation' | 'subscription' | 'sql'
}

export interface HistorySearchOptions {
  query?: string
  operationType?: 'query' | 'mutation' | 'subscription' | 'sql'
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface HistoryState {
  items: HistoryItem[]
  isLoading: boolean
  searchQuery: string
  filteredItems: HistoryItem[]
}
