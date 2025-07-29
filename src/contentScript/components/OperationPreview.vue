<template>
  <div class="operation-preview" :style="{ top: y + 'px', left: x + 'px' }">
    <div class="preview-content">
      <div class="operation">
        <h4>Operation</h4>
        <pre>{{ operation }}</pre>
      </div>
      <div v-if="variables" class="variables">
        <h4>Variables</h4>
        <pre>{{ variables }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  operation: string
  variables?: string
  x: number
  y: number
}>()
</script>

<style scoped>
.operation-preview {
  position: fixed;
  background-color: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 15px;
  z-index: 10000;
  max-width: 500px;
  pointer-events: none;
}

.preview-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
}

.preview-content h4 {
  margin-top: 0;
  margin-bottom: 5px;
}
</style>
