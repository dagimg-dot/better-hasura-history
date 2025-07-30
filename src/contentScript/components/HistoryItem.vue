<template>
  <li
    @click="!isConfirmingDelete && $emit('select-item', item)"
    @mouseenter="$emit('show-preview', $event, item)"
    @mouseleave="handleMouseLeave"
    @mousemove="$emit('move-preview', $event)"
  >
    <div class="item-content">{{ item.operation_name }}</div>
    <div class="actions">
      <button
        v-if="!isConfirmingDelete"
        class="action-button"
        title="Delete item"
        @click.stop="isConfirmingDelete = true"
      >
        <!-- Trash Can SVG -->
        <svg
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

      <div v-if="isConfirmingDelete" class="confirmation-buttons">
        <button
          class="action-button confirm"
          title="Confirm delete"
          @click.stop="confirmDeleteItem"
        >
          <!-- Checkmark SVG -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button
          class="action-button cancel"
          title="Cancel"
          @click.stop="isConfirmingDelete = false"
        >
          <!-- 'X' SVG for Cancel -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { HistoryEntry } from '../types'
import { history } from '../state'

const props = defineProps<{
  item: HistoryEntry
}>()

const emit = defineEmits<{
  (e: 'select-item', item: HistoryEntry): void
  (e: 'show-preview', event: MouseEvent, item: HistoryEntry): void
  (e: 'hide-preview'): void
  (e: 'move-preview', event: MouseEvent): void
}>()

const isConfirmingDelete = ref(false)

const confirmDeleteItem = () => {
  history.value = history.value.filter((h) => h.id !== props.item.id)
}

// When the mouse leaves the item, cancel any pending confirmation
const handleMouseLeave = () => {
  isConfirmingDelete.value = false
  emit('hide-preview')
}
</script>

<style scoped>
li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

li:hover {
  background-color: #e10098;
  color: white;
}

.item-content {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.actions {
  display: flex;
  align-items: center;
}

.action-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  margin-left: 4px;
  color: white;
  display: none; /* Hide actions by default */
  line-height: 1;
}

li:hover .action-button {
  display: block; /* Show on li hover */
}

.confirmation-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-button.confirm:hover {
  color: #a7f3d0; /* light green */
}
.action-button.cancel:hover {
  color: #fca5a5; /* light red */
}
</style>
