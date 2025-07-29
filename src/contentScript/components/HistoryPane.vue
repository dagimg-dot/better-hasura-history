<template>
  <div v-if="state.isPaneOpen" class="better-history-pane">
    <div class="better-history-title-bar">
      <div class="better-history-title">Better History</div>
      <div>
        <button class="better-history-close-button" @click="state.isPaneOpen = false">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M12 4L4 12"
              stroke="#000000"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M4 4L12 12"
              stroke="#000000"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
    <HistorySearch @update:searchTerm="updateSearchTerm" />
    <div class="history-list">
      <ul>
        <li v-for="item in filteredHistory" :key="item.id">
          <div>{{ item.operation_name }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { state, history } from '../state'
import HistorySearch from './HistorySearch.vue'

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

.history-list li {
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.history-list li:hover {
  background-color: #e10098;
  color: white;
}
</style>
