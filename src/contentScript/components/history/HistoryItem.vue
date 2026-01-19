<template>
  <li
    :class="{ selected: selected }"
    @click="!isConfirmingDelete && !isEditing && $emit('select-item', item)"
    @mouseenter="$emit('show-preview', $event, item)"
    @mouseleave="handleMouseLeave"
    @mousemove="$emit('move-preview', $event)"
  >
    <div v-if="!isEditing" class="item-content">
      {{ item.operationName }}
    </div>
    <div v-else class="edit-container">
      <input
        v-model="editableName"
        type="text"
        class="edit-input"
        @keydown.enter.prevent="saveEdit"
        @keydown.esc.prevent="cancelEdit"
        @click.stop
      />
    </div>

    <div class="actions">
      <!-- Default view buttons -->
      <template v-if="!isEditing && !isConfirmingDelete">
        <button class="action-button" title="Edit name" @click.stop="startEditing">
          <!-- Pencil SVG -->
          <svg
            xmlns="http://www.w3.org/i000/svg"
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
        <button class="action-button" title="Delete item" @click.stop="isConfirmingDelete = true">
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
      </template>

      <!-- Delete confirmation buttons -->
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

      <!-- Edit confirmation buttons -->
      <div v-if="isEditing" class="confirmation-buttons">
        <button class="action-button confirm" title="Save" @click.stop="saveEdit">
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
        <button class="action-button cancel" title="Cancel" @click.stop="cancelEdit">
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
import { nextTick, ref } from 'vue'
import { useHistory } from '@/contentScript/composables/useHistory'
import type { HistoryItem } from '@/shared/types/history'

const props = defineProps<{
  item: HistoryItem
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'select-item', item: HistoryItem): void
  (e: 'show-preview', event: MouseEvent, item: HistoryItem): void
  (e: 'hide-preview'): void
  (e: 'move-preview', event: MouseEvent): void
}>()

const { removeHistoryItem, updateHistoryItem } = useHistory()

const isConfirmingDelete = ref(false)
const isEditing = ref(false)
const editableName = ref('')

const confirmDeleteItem = () => {
  removeHistoryItem(props.item.id)
}

const startEditing = async () => {
  isEditing.value = true
  editableName.value = props.item.operationName || ''
  // Focus the input after it's rendered
  await nextTick()
  const input = document.querySelector('.edit-input') as HTMLInputElement
  input?.focus()
  input?.select()
}

const saveEdit = () => {
  if (editableName.value.trim() === '') return // Do not save if empty

  updateHistoryItem(props.item.id, { operationName: editableName.value })

  isEditing.value = false
}

const cancelEdit = () => {
  isEditing.value = false
}

// When the mouse leaves the item, cancel any pending confirmation
const handleMouseLeave = () => {
  isConfirmingDelete.value = false
  // Do not cancel edit on mouse leave, as user might be interacting with buttons
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
  transition: background-color 0.1s ease-in-out;
}

li:hover {
  background-color: #f0f0f0;
}

li.selected {
  background-color: #156c85;
  /* Primary color from your theme */
  color: white;
}

/* When selected, hover should not change the color */
li.selected:hover {
  background-color: #156c85;
}

.item-content {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.edit-container {
  flex-grow: 1;
  margin-right: 8px;
}

.edit-input {
  width: 100%;
  padding: 2 gvpx;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  margin-left: 4px;
  color: #888;
  /* A more visible default color */
  display: none;
  /* Hide actions by default */
  line-height: 1;
}

li:hover .action-button {
  display: flex;
  /* Use flex to align SVG correctly */
}

li.selected .action-button,
li.selected:hover .action-button {
  display: flex;
  color: white;
}

.confirmation-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Make confirmation buttons always visible when their state is active */
.confirmation-buttons .action-button {
  display: flex;
}

.action-button.confirm:hover {
  color: #a7f3d0;
  /* light green */
}

.action-button.cancel:hover {
  color: #fca5a5;
  /* light red */
}
</style>
