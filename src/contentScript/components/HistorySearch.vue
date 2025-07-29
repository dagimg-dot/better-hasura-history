<template>
  <div class="history-search-container">
    <input type="text" placeholder="Search history..." v-model="searchTerm" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const searchTerm = ref('')
const emit = defineEmits(['update:searchTerm'])

watch(searchTerm, (newVal) => {
  emit('update:searchTerm', newVal)
})
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
