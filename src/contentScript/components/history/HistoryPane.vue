<template>
  <div v-if="isPaneOpen" class="better-history-pane">
    <div class="better-history-title-bar">
      <div class="better-history-title">Better History</div>
      <div>
        <BetterHistoryCloseButton />
      </div>
    </div>
    <HistorySearch
      @update:searchTerm="updateSearchTerm"
      @navigate-down="handleKeyNavigation('down')"
      @navigate-up="handleKeyNavigation('up')"
      @select-entry="handleSelectEntry"
    />
    <div class="history-list" ref="historyListRef">
      <ul>
        <HistoryItem
          v-for="(item, index) in filteredHistory"
          :key="item.id"
          :item="item"
          :selected="index === selectedItemIndex"
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { history, isPaneOpen } from '@/contentScript/state'
import type { HistoryEntry } from '@/contentScript/types'
import { BetterHistoryCloseButton } from '@/contentScript/components/controls'
import { HistoryItem, HistorySearch, OperationPreview } from '@/contentScript/components/history'

const applyHistoryItem = async (item: HistoryEntry) => {
  window.postMessage(
    {
      type: 'BHH_APPLY_HISTORY_ITEM',
      data: {
        operation: item.operation,
        variables: item.variables,
      },
    },
    '*',
  )
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
const selectedItemIndex = ref(-1)
const historyListRef = ref<HTMLDivElement | null>(null)

const filteredHistory = computed(() => {
  if (!searchTerm.value) {
    return history.value
  }
  return history.value.filter((item) =>
    item.operation_name.toLowerCase().includes(searchTerm.value.toLowerCase()),
  )
})

// Reset selection when search term changes
watch(searchTerm, () => {
  selectedItemIndex.value = -1
})

const updateSearchTerm = (newVal: string) => {
  searchTerm.value = newVal
}

const handleKeyNavigation = (direction: 'up' | 'down') => {
  const list = filteredHistory.value
  if (!list.length) return

  let newIndex = selectedItemIndex.value
  if (direction === 'down') {
    newIndex = (newIndex + 1) % list.length
  } else {
    // 'up'
    newIndex = (newIndex - 1 + list.length) % list.length
  }
  selectedItemIndex.value = newIndex
}

const handleSelectEntry = () => {
  const list = filteredHistory.value
  if (selectedItemIndex.value >= 0 && selectedItemIndex.value < list.length) {
    applyHistoryItem(list[selectedItemIndex.value])
  }
}

// Scroll the selected item into view
watch(selectedItemIndex, async (newIndex) => {
  if (newIndex < 0 || !historyListRef.value) return

  await nextTick()
  const selectedElement = historyListRef.value?.querySelector('li.selected')
  if (selectedElement) {
    selectedElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }
})

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && selectedItemIndex.value !== -1) {
    selectedItemIndex.value = -1
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style scoped>
.better-history-pane {
  background: white;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 250px;
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
