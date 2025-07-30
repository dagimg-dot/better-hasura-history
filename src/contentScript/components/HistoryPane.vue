<template>
  <div v-if="isPaneOpen" class="better-history-pane">
    <div class="better-history-title-bar">
      <div class="better-history-title">Better History</div>
      <div>
        <BetterHistoryCloseButton />
      </div>
    </div>
    <HistorySearch @update:searchTerm="updateSearchTerm" />
    <div class="history-list">
      <ul>
        <HistoryItem
          v-for="item in filteredHistory"
          :key="item.id"
          :item="item"
          @select-item="applyHistoryItem"
          @show-preview="handleMouseEnter"
          @hide-preview="handleMouseLeave"
          @move-preview="handleMouseMove"
        />
      </ul>
    </div>
    <OperationPreview
      ref="operationPreviewRef"
      v-if="tooltip.visible"
      :operation="tooltip.operation"
      :variables="tooltip.variables"
      :x="tooltip.x"
      :y="tooltip.y"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { history, isPaneOpen } from '../state'
import HistorySearch from './HistorySearch.vue'
import OperationPreview from './OperationPreview.vue'
import BetterHistoryCloseButton from './BetterHistoryCloseButton.vue'
import HistoryItem from './HistoryItem.vue'
import type { HistoryEntry } from '../types'
import { logger } from '../utils/logger'

const applyHistoryItem = async (item: HistoryEntry) => {
  const queryTextarea = document.querySelector('.query-editor textarea') as HTMLTextAreaElement
  const variablesTextarea = document.querySelector(
    '.variable-editor textarea',
  ) as HTMLTextAreaElement

  if (!queryTextarea || !variablesTextarea) {
    logger.error('Could not find one or both editor textareas.')
    return
  }

  queryTextarea.focus()
  document.execCommand('insertText', false, item.operation)

  variablesTextarea.focus()
  let finalVariables = item.variables || ''
  // TODO: Might enable is in the future
  // if (finalVariables) {
  //   try {
  //     const parsed = JSON.parse(finalVariables)
  //     finalVariables = JSON.stringify(parsed, null, 2)
  //   } catch (e) {
  //     console.error('Error parsing variables:', e)
  //   }
  // }
  document.execCommand('insertText', false, finalVariables)
}

const operationPreviewRef = ref<any>(null)

const tooltip = ref({
  visible: false,
  operation: '',
  variables: '',
  x: 0,
  y: 0,
})

const updateTooltipPosition = (event: MouseEvent) => {
  const tooltipEl = operationPreviewRef.value?.$el
  if (!tooltipEl) return

  const tooltipHeight = tooltipEl.offsetHeight
  const windowHeight = window.innerHeight

  let y = event.clientY + 15
  if (y + tooltipHeight > windowHeight) {
    y = event.clientY - tooltipHeight - 15
  }
  if (y < 0) {
    y = 5
  }

  tooltip.value.x = event.clientX + 15
  tooltip.value.y = y
}

const handleMouseEnter = async (event: MouseEvent, item: HistoryEntry) => {
  if (event.ctrlKey || event.metaKey) {
    tooltip.value.visible = true
    tooltip.value.operation = item.operation
    tooltip.value.variables = item.variables || ''

    await nextTick()

    updateTooltipPosition(event)
  }
}

const handleMouseLeave = () => {
  tooltip.value.visible = false
}

const handleMouseMove = (event: MouseEvent) => {
  if (tooltip.value.visible) {
    updateTooltipPosition(event)
  }
}

const searchTerm = ref('')

const filteredHistory = computed(() => {
  if (!searchTerm.value) {
    return history.value
  }
  return history.value.filter((item) =>
    item.operation_name.toLowerCase().includes(searchTerm.value.toLowerCase()),
  )
})

const updateSearchTerm = (newVal: string) => {
  searchTerm.value = newVal
}
</script>

<style scoped>
.better-history-pane {
  background: white;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 230px;
  z-index: 7;
  height: 100%;
}

.better-history-title-bar {
  cursor: default;
  display: flex;
  line-height: 14px;
  padding: 15px 10px 16px 10px;
  position: relative;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  border-bottom: 1px solid #e0e0e0;
}

.better-history-title {
  flex: 1;
  font-weight: bold;
  text-align: center;
  text-overflow: ellipsis;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
  white-space: nowrap;
}

.history-list {
  overflow-y: auto;
  flex-grow: 1;
}

.history-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>
