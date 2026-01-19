export interface HistoryItem {
  id: string
  query: string
  variables?: Record<string, any>
  timestamp: number
  operationName?: string
  operationType: 'query' | 'mutation' | 'subscription'
}

export interface HistorySearchOptions {
  query?: string
  operationType?: 'query' | 'mutation' | 'subscription'
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
