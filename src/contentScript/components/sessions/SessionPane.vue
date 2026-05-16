<template>
  <details open class="bhh-session-details">
    <summary class="cursor-pointer inline-block items-center">
      <span class="inline-block text-xs mr-sm">
        <i class="fa fa-chevron-right bhh-chevron"></i>
      </span>
      <span class="inline-block">
        <div class="font-semibold" style="display: flex; align-items: center; gap: 8px">
          <span>Better Session</span>
          <button class="bhh-new-session-btn" @click.stop="handleAddSession">+ New Session</button>
        </div>
      </span>
    </summary>
    <div v-if="activeAuth" class="bhh-auth-status">
      <span class="bhh-auth-label">Authorization:</span>
      <span class="bhh-auth-bearer">Bearer {{ activeAuth.shortToken }}</span>
      <span v-if="activeAuth.roleName" class="bhh-auth-role">| {{ activeAuth.roleName }}</span>
    </div>
    <div class="mt-sm">
      <div v-if="sessions.length === 0" class="bhh-empty-state">
        No sessions configured. Click "+ New Session" to add one.
      </div>
      <div v-else class="bhh-session-list">
        <SessionRow
          v-for="session in sessions"
          :key="session.id"
          :session="session"
          @authenticate="handleAuthenticate"
        />
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import {
  SessionAuthService,
  decodeJWTPayload,
  getValueByDotPath,
} from '@/contentScript/services/SessionAuthService'
import { useSessions } from '@/contentScript/composables/useSessions'
import SessionRow from './SessionRow.vue'
import { logger } from '@/contentScript/utils/logger'
import type { Session } from '@/shared/types'

import { computed } from 'vue'

const { sessions, addSession, updateSession, removeSession } = useSessions()

const activeAuth = computed(() => {
  const active = sessions.value.find((s) => s.status === 'success' && s.token)
  if (!active?.token) return null

  const shortToken =
    active.token.length > 24
      ? active.token.substring(0, 8) + '...' + active.token.slice(-6)
      : active.token

  let roleName = ''
  if (active.roleNamePath) {
    const payload = decodeJWTPayload(active.token)
    if (payload) {
      const val = getValueByDotPath(payload, active.roleNamePath)
      if (typeof val === 'string') roleName = val
    }
  }

  return { token: active.token, shortToken, roleName }
})

function handleAddSession() {
  addSession()
  logger.debug('SessionPane: new session added')
}

async function handleAuthenticate(sessionId: string) {
  const session = sessions.value.find((s) => s.id === sessionId)
  if (!session) return

  updateSession(sessionId, { status: 'authenticating', error: undefined, token: undefined })

  try {
    const { token } = await SessionAuthService.authenticate(
      session.mutation,
      session.variables,
      session.token || undefined,
    )
    const updates: Record<string, any> = { status: 'success', token }

    if (session.roleNamePath) {
      const payload = decodeJWTPayload(token)
      if (payload) {
        const roleName = getValueByDotPath(payload, session.roleNamePath)
        if (typeof roleName === 'string' && roleName.length > 0) {
          updates.name = roleName
        }
      }
    }

    updateSession(sessionId, updates)
    logger.info('SessionPane: authentication successful for', {
      name: updates.name || session.name,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error(
      'SessionPane: authentication failed',
      error instanceof Error ? error : new Error(msg),
    )
    updateSession(sessionId, { status: 'error', error: msg })
  }
}
</script>

<style scoped>
.bhh-session-details {
  margin-top: 8px;
}

.bhh-session-details[open] .bhh-chevron {
  transform: rotate(90deg);
}

.bhh-session-details:not([open]) .bhh-chevron {
  transform: rotate(0deg);
  transition: transform 0.15s ease;
}

.bhh-session-details summary {
  padding: 4px 0;
}

.bhh-new-session-btn {
  font-size: 12px;
  padding: 1px 8px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  background: linear-gradient(#f9f9f9, #ececec);
  color: #555;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 500;
  line-height: 1.6;
}

.bhh-new-session-btn:hover {
  background: linear-gradient(#f0f0f0, #e0e0e0);
}

.bhh-auth-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0 4px 20px;
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: #059669;
}

.bhh-auth-label {
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.bhh-auth-bearer {
  color: #374151;
}

.bhh-auth-role {
  color: #059669;
  font-weight: 600;
}

.bhh-empty-state {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

.bhh-session-list {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 4px 12px;
  background: #fff;
}
</style>
