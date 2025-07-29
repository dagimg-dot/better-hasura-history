<template>
  <button @click="togglePane" class="better-history-button" title="View API call history">
    Better History
  </button>
</template>

<script setup lang="ts">
import { isPaneOpen } from '../state'

const togglePane = () => {
  isPaneOpen.value = !isPaneOpen.value
}
</script>

<style scoped>
.better-history-button {
  background-color: #fdfdfd;
  background: linear-gradient(#f9f9f9, #ececec);
  border: 0;
  border-radius: 3px;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.2),
    0 1px 0 rgba(255, 255, 255, 0.7),
    inset 0 1px #fff;
  color: #555 !important;
  cursor: pointer;
  display: inline-block;
  margin: 0 5px;
  padding: 3px 11px 5px;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}
</style>
