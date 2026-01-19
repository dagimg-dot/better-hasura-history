<template>
  <div v-if="isPaneOpen" class="better-history-pane">
    <div class="better-history-title-bar">
      <div class="better-history-title">Better History</div>
      <div style="display: flex; gap: 5px; align-items: center">
        <button class="icon-btn" @click.stop="handleExport" title="Export History">
          <svg
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <button class="icon-btn" @click.stop="triggerImport" title="Import History">
          <svg
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
        <input
          type="file"
          ref="fileInputRef"
          accept=".json"
          style="display: none"
          @change="handleImport"
        />
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
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useExtensionState } from '@/contentScript/composables/useExtensionState'
import { useHistory } from '@/contentScript/composables/useHistory'
import type { HistoryItem as HistoryItemType } from '@/shared/types/history'
import { BetterHistoryCloseButton } from '@/contentScript/components/controls'
import { HistoryItem, HistorySearch, OperationPreview } from '@/contentScript/components/history'

const { isPaneOpen } = useExtensionState()
const {
  filteredItems: filteredHistory,
  searchQuery,
  items,
  exportHistory,
  importHistory,
} = useHistory()
import { logger } from '@/contentScript/utils/logger'

const fileInputRef = ref<HTMLInputElement | null>(null)

const handleExport = () => {
  const json = exportHistory()
  window.postMessage(
    {
      type: 'BHH_EXPORT_HISTORY',
      data: {
        json,
        filename: `better-hasura-history-backup-${new Date().toISOString().split('T')[0]}.json`,
      },
    },
    '*',
  )
}

const triggerImport = () => {
  fileInputRef.value?.click()
}

const handleImport = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const file = input.files[0]
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const data = JSON.parse(content)
      if (Array.isArray(data)) {
        const count = importHistory(data)
        alert(`Successfully imported ${count} items`)
      } else {
        alert('Invalid backup file format (expected array)')
      }
    } catch (error) {
      logger.error('Failed to import file', error as Error)
      alert('Failed to parse backup file')
    } finally {
      // Reset input
      input.value = ''
    }
  }

  reader.readAsText(file)
}

const applyHistoryItem = async (item: HistoryItemType) => {
  window.postMessage(
    {
      type: 'BHH_APPLY_HISTORY_ITEM',
      data: {
        operation: item.query,
        variables: JSON.stringify(item.variables, null, 2),
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

const handleMouseEnter = async (event: MouseEvent, item: HistoryItemType) => {
  if (event.ctrlKey || event.metaKey) {
    tooltip.value.visible = true
    tooltip.value.operation = item.query
    tooltip.value.variables = item.variables ? JSON.stringify(item.variables, null, 2) : ''

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

const selectedItemIndex = ref(-1)
const historyListRef = ref<HTMLDivElement | null>(null)

// Reset selection when search term changes
watch(searchQuery, () => {
  selectedItemIndex.value = -1
})

const updateSearchTerm = (newVal: string) => {
  searchQuery.value = newVal
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

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  border-radius: 3px;
}

.icon-btn:hover {
  background-color: #f0f0f0;
  color: #333;
}
</style>
