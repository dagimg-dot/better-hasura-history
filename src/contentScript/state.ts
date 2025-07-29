import { useStorage } from '@vueuse/core'
import type { HistoryEntry } from './types'

export const isPaneOpen = useStorage('better-hasura-pane-open', false)

export const history = useStorage<HistoryEntry[]>('better-hasura-history', [])
