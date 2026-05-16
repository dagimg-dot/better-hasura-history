export interface Session {
  id: string
  name: string
  mutation: string
  variables: Record<string, any>
  optionLabel: string
  roleNamePath: string
  status: 'idle' | 'authenticating' | 'success' | 'error'
  token?: string
  error?: string
}

export interface SessionState {
  sessions: Session[]
}
