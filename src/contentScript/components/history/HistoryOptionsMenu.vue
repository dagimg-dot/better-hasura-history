<template>
  <div class="options-menu-container" ref="menuRef">
    <button class="icon-btn dots-btn" @click="toggleMenu" title="History Options">
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
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
      </svg>
    </button>

    <div v-if="isOpen" class="dropdown-menu">
      <div class="menu-item" @click="handleAction('export')">
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
        <span>Export History</span>
      </div>
      <div class="menu-item" @click="handleAction('import')">
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
        <span>Import History</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" @click="handleAction('clear')">
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
          <polyline points="3 6 5 6 21 6"></polyline>
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          ></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
        <span>Clear History</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'

const emit = defineEmits<{
  (e: 'export'): void
  (e: 'import'): void
  (e: 'clear'): void
}>()

const isOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const toggleMenu = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  isOpen.value = !isOpen.value
}

const handleAction = (type: 'export' | 'import' | 'clear') => {
  if (type === 'export') emit('export')
  else if (type === 'import') emit('import')
  else if (type === 'clear') emit('clear')
  isOpen.value = false
}

onClickOutside(
  menuRef,
  () => {
    if (isOpen.value) isOpen.value = false
  },
  { ignore: [] }, // Make sure we don't accidentally ignore the button
)
</script>

<style scoped>
.options-menu-container {
  position: relative;
  display: flex;
  align-items: center;
}

.dots-btn {
  color: #666;
  opacity: 0.8;
  padding: 2px;
  transition:
    opacity 0.2s,
    background-color 0.2s;
}

.dots-btn:hover {
  opacity: 1;
  background-color: #f0f0f0;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 5px;
  background-color: #ffffff !important;
  border: 1px solid #e0e0e0 !important;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  z-index: 99999 !important;
  padding: 4px 0;
  display: block;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item svg {
  color: #666;
}

.menu-item.danger {
  color: #d32f2f;
}

.menu-item.danger:hover {
  background-color: #fef2f2;
}

.menu-item.danger svg {
  color: #d32f2f;
}

.menu-divider {
  height: 1px;
  background-color: #f0f0f0;
  margin: 4px 0;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
</style>
