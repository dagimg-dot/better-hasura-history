<template>
  <div class="history-search-container">
    <input
      type="text"
      placeholder="Search history..."
      v-model="searchTerm"
      @keydown="handleKeydown"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { watchDebounced } from '@vueuse/core'

const searchTerm = ref('')
const emit = defineEmits(['update:searchTerm', 'navigate-down', 'navigate-up', 'select-entry'])

watchDebounced(
  searchTerm,
  (newVal) => {
    emit('update:searchTerm', newVal)
  },
  { debounce: 150, maxWait: 500 },
)

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    emit('navigate-down')
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    emit('navigate-up')
  } else if (event.key === 'Enter') {
    event.preventDefault()
    emit('select-entry')
  }
}
</script>

<style scoped>
.history-search-container {
  padding: 10px;
}

input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}
</style>
