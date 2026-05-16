import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { EXTENSION_CONFIG } from '@/shared/constants'
import type { Session } from '@/shared/types'

const DEFAULT_MUTATION = `mutation login($objects: LoginInput!) {
  login(objects: $objects) {
    metadata
    token
  }
}`

const DEFAULT_VARIABLES: Record<string, any> = {
  objects: {
    username: '',
    password: '',
  },
}

function createDefaultSession(): Session {
  return {
    id: crypto.randomUUID(),
    name: 'Session',
    mutation: DEFAULT_MUTATION,
    variables: JSON.parse(JSON.stringify(DEFAULT_VARIABLES)),
    optionLabel: 'Driver Login',
    status: 'idle',
  }
}

const sessions = useStorage<Session[]>(EXTENSION_CONFIG.STORAGE_KEYS.SESSIONS, [], undefined, {
  shallow: true,
})

const expandingSessionId = ref<string | null>(null)

export function useSessions() {
  const sessionList = computed(() => sessions.value)

  const addSession = () => {
    const newSession = createDefaultSession()
    sessions.value = [...sessions.value, newSession]
    return newSession
  }

  const removeSession = (id: string) => {
    sessions.value = sessions.value.filter((s) => s.id !== id)
  }

  const updateSession = (id: string, updates: Partial<Session>) => {
    sessions.value = sessions.value.map((s) => (s.id === id ? { ...s, ...updates } : s))
  }

  const getSessionById = (id: string): Session | undefined => {
    return sessions.value.find((s) => s.id === id)
  }

  const getFieldLabels = (session: Session): string[] => {
    const varKeys = Object.keys(session.variables)
    for (const key of varKeys) {
      const val = session.variables[key]
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return Object.keys(val)
      }
    }
    return []
  }

  const getFieldValues = (session: Session): Record<string, string> => {
    const varKeys = Object.keys(session.variables)
    for (const key of varKeys) {
      const val = session.variables[key]
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return { ...val }
      }
    }
    return {}
  }

  const setFieldValue = (session: Session, fieldKey: string, value: string) => {
    const updated = { ...session }
    const varKeys = Object.keys(updated.variables)
    for (const key of varKeys) {
      const val = updated.variables[key]
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        updated.variables = {
          ...updated.variables,
          [key]: { ...val, [fieldKey]: value },
        }
        break
      }
    }
    updateSession(session.id, { variables: updated.variables })
  }

  const resetSessionStatus = (id: string) => {
    updateSession(id, { status: 'idle', token: undefined, error: undefined })
  }

  const setExpandingSession = (id: string | null) => {
    expandingSessionId.value = id
  }

  return {
    sessions: sessionList,
    expandingSessionId,
    addSession,
    removeSession,
    updateSession,
    getSessionById,
    getFieldLabels,
    getFieldValues,
    setFieldValue,
    resetSessionStatus,
    setExpandingSession,
    createDefaultSession,
  }
}
