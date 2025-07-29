import { reactive } from 'vue'
import { useStorage } from '@vueuse/core'
import type { HistoryEntry } from './types'

export const state = reactive({
  isPaneOpen: false,
})

export const history = useStorage<HistoryEntry[]>('better-hasura-history', [])
