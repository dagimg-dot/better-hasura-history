export interface ParsedLine {
  lineNumber: number // from the gutter
  code: string // the visible code text
  indentLevel: number // how many leading tabs/spaces (optional)
  foldable?: boolean // whether that line has a fold marker
}

export interface ParsedCode {
  lines: ParsedLine[]
}

export interface HistoryEntry {
  id: string
  operation_name: string
  operation: string
  variables?: string
  createdAt: string
}

export type ParsedQuery = Omit<HistoryEntry, 'id' | 'createdAt'>
