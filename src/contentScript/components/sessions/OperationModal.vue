<template>
  <Teleport to="body">
    <div v-if="visible" class="bhh-modal-overlay" @click.self="$emit('close')">
      <div class="bhh-modal bhh-modal-wide">
        <div class="bhh-modal-header">
          <span class="bhh-modal-title">Customize Operation</span>
          <button class="bhh-modal-close" @click="$emit('close')">✕</button>
        </div>
        <div class="bhh-modal-body">
          <div class="bhh-modal-section">
            <label class="bhh-modal-label">Mutation</label>
            <textarea
              ref="textareaRef"
              class="bhh-modal-textarea"
              v-model="localMutation"
              spellcheck="false"
            ></textarea>
          </div>
          <div class="bhh-modal-section">
            <label class="bhh-modal-label">Variables (JSON)</label>
            <textarea
              class="bhh-modal-textarea bhh-modal-textarea-sm"
              v-model="localVariablesStr"
              spellcheck="false"
            ></textarea>
            <p v-if="variablesError" class="bhh-modal-error">{{ variablesError }}</p>
          </div>
          <div class="bhh-modal-section">
            <label class="bhh-modal-label">Role Name (JWT dot-path)</label>
            <input
              class="bhh-modal-input"
              v-model="localRoleNamePath"
              placeholder="e.g. klik.x-hasura-default-role"
            />
            <p class="bhh-modal-hint">
              Dot-notation path to extract from decoded JWT payload. Used as session name after
              authentication.
            </p>
          </div>
        </div>
        <div class="bhh-modal-footer">
          <button class="bhh-modal-btn bhh-modal-btn-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button
            class="bhh-modal-btn bhh-modal-btn-primary"
            :disabled="!!variablesError"
            @click="handleSave"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps<{
  visible: boolean
  mutation: string
  variables: Record<string, any>
  roleNamePath: string
}>()

const emit = defineEmits<{
  close: []
  save: [mutation: string, variables: Record<string, any>, roleNamePath: string]
}>()

const localMutation = ref(props.mutation)
const localVariablesStr = ref(JSON.stringify(props.variables, null, 2))
const localRoleNamePath = ref(props.roleNamePath)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const variablesError = computed(() => {
  try {
    JSON.parse(localVariablesStr.value)
    return null
  } catch {
    return 'Invalid JSON'
  }
})

watch(
  () => props.visible,
  (show) => {
    if (show) {
      localMutation.value = props.mutation
      localVariablesStr.value = JSON.stringify(props.variables, null, 2)
      localRoleNamePath.value = props.roleNamePath
      nextTick(() => {
        textareaRef.value?.focus()
      })
    }
  },
)

function handleSave() {
  try {
    const parsed = JSON.parse(localVariablesStr.value)
    emit('save', localMutation.value, parsed, localRoleNamePath.value)
  } catch {
    emit('save', localMutation.value, props.variables, localRoleNamePath.value)
  }
  emit('close')
}
</script>

<style scoped>
.bhh-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bhh-modal {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  width: 640px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.bhh-modal-wide {
  width: 720px;
}

.bhh-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.bhh-modal-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.bhh-modal-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
}

.bhh-modal-body {
  padding: 12px 16px;
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bhh-modal-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bhh-modal-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.bhh-modal-textarea {
  width: 100%;
  min-height: 200px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.bhh-modal-textarea-sm {
  min-height: 120px;
}

.bhh-modal-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.bhh-modal-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  outline: none;
  box-sizing: border-box;
}

.bhh-modal-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.bhh-modal-hint {
  font-size: 11px;
  color: #9ca3af;
  margin: 2px 0 0;
}

.bhh-modal-error {
  font-size: 12px;
  color: #dc2626;
  margin: 0;
}

.bhh-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
}

.bhh-modal-btn {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
}

.bhh-modal-btn-primary {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.bhh-modal-btn-primary:hover {
  background: #2563eb;
}
</style>
