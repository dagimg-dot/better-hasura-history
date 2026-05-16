<template>
  <div class="session-row" :class="{ 'session-row-error': session.status === 'error' }">
    <div class="session-row-header">
      <input
        class="session-name-input"
        :value="session.name"
        @input="updateName"
        placeholder="Session name"
      />
      <span v-if="active" class="session-active-badge">ACTIVE</span>
      <div class="session-row-actions">
        <span v-if="session.status === 'authenticating'" class="session-status authenticating">
          <span class="spinner"></span> Authenticating...
        </span>
        <span v-else-if="session.status === 'success'" class="session-status success"
          >Token set ✓</span
        >
        <span v-else-if="session.status === 'error'" class="session-status error">Failed</span>
        <button
          class="authenticate-btn"
          :disabled="session.status === 'authenticating'"
          @click="$emit('authenticate', session.id)"
        >
          {{ session.status === 'authenticating' ? '...' : 'Authenticate' }}
        </button>
        <button class="session-action-btn" title="Customize Operation" @click="handleCustomize">
          <svg
            v-once
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </button>
        <button
          class="session-action-btn session-action-btn-danger"
          title="Delete Session"
          @click="handleDelete"
        >
          <svg
            v-once
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path
              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            ></path>
          </svg>
        </button>
      </div>
    </div>
    <div v-if="session.status === 'error' && session.error" class="session-error-msg">
      {{ session.error }}
    </div>
    <div class="session-fields">
      <div v-for="label in fieldLabels" :key="label" class="session-field">
        <div class="session-field-label">{{ label }}</div>
        <div class="session-field-input-wrap">
          <input
            class="session-field-input"
            :type="isPasswordField(label) && !isPasswordVisible(label) ? 'password' : 'text'"
            :value="fieldValues[label] || ''"
            :placeholder="label"
            @input="handleFieldInput(label, ($event.target as HTMLInputElement).value)"
          />
          <button
            v-if="isPasswordField(label)"
            class="session-field-eye"
            @click="togglePassword(label)"
            :title="isPasswordVisible(label) ? 'Hide' : 'Show'"
          >
            <svg
              v-if="isPasswordVisible(label)"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
              ></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <OperationModal
      :visible="showModal"
      :mutation="session.mutation"
      :variables="session.variables"
      :role-name-path="session.roleNamePath"
      @close="showModal = false"
      @save="handleSaveOperation"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Session } from '@/shared/types'
import { useSessions } from '@/contentScript/composables/useSessions'
import OperationModal from './OperationModal.vue'

const props = defineProps<{
  session: Session
  active: boolean
}>()

const emit = defineEmits<{
  authenticate: [id: string]
}>()

const { getFieldLabels, getFieldValues, setFieldValue, updateSession, removeSession } =
  useSessions()

const showModal = ref(false)
const visiblePasswords = ref<Set<string>>(new Set())

const fieldLabels = computed(() => getFieldLabels(props.session))
const fieldValues = computed(() => getFieldValues(props.session))

function isPasswordField(label: string): boolean {
  return label.toLowerCase().includes('password')
}

function isPasswordVisible(label: string): boolean {
  return isPasswordField(label) && visiblePasswords.value.has(label)
}

function togglePassword(label: string) {
  const next = new Set(visiblePasswords.value)
  if (next.has(label)) {
    next.delete(label)
  } else {
    next.add(label)
  }
  visiblePasswords.value = next
}

function handleCustomize() {
  showModal.value = true
}

function handleDelete() {
  removeSession(props.session.id)
}

function handleSaveOperation(
  mutation: string,
  variables: Record<string, any>,
  roleNamePath: string,
) {
  updateSession(props.session.id, { mutation, variables, roleNamePath })
}

function handleFieldInput(label: string, value: string) {
  setFieldValue(props.session, label, value)
}

function updateName(e: Event) {
  const val = (e.target as HTMLInputElement).value
  updateSession(props.session.id, { name: val })
}
</script>

<style scoped>
.session-row {
  border-bottom: 1px solid #e5e7eb;
  padding: 8px 0;
}

.session-row:last-child {
  border-bottom: none;
}

.session-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.session-name-input {
  border: 0;
  outline: none;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  padding: 2px 4px;
  flex: 1;
  min-width: 0;
  background: transparent;
}

.session-name-input:focus {
  background: #f9fafb;
  border-radius: 2px;
}

.session-active-badge {
  font-size: 10px;
  font-weight: 700;
  color: #059669;
  background: #ecfdf5;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.session-row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.session-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.session-status.authenticating {
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

.session-status.success {
  color: #059669;
  background: #ecfdf5;
}

.session-status.error {
  color: #dc2626;
  background: #fef2f2;
}

.spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1.5px solid #d1d5db;
  border-top-color: #6b7280;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.authenticate-btn {
  font-size: 12px;
  padding: 3px 10px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  background: linear-gradient(#f9f9f9, #ececec);
  color: #555;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 500;
}

.authenticate-btn:hover:not(:disabled) {
  background: linear-gradient(#f0f0f0, #e0e0e0);
}

.authenticate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.session-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.session-action-btn:hover {
  color: #333;
}

.session-action-btn-danger:hover {
  color: #d32f2f;
}

.session-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 4px;
}

.session-field {
  flex: 1;
  min-width: 140px;
}

.session-field-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
  margin-bottom: 2px;
  padding: 0 2px;
}

.session-field-input {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  padding: 5px 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
  box-sizing: border-box;
}

.session-field-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.session-field-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.session-field-input-wrap .session-field-input {
  padding-right: 28px;
}

.session-field-eye {
  position: absolute;
  right: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.session-field-eye:hover {
  color: #374151;
}

.session-error-msg {
  font-size: 12px;
  color: #dc2626;
  padding: 4px 4px 6px;
  word-break: break-word;
}
</style>
