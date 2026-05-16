<template>
  <div class="toolbar-buttons">
    <BetterButton label="Better History" title="View API call history" :onClick="togglePane" />
    <BetterButton
      :label="refreshLabel"
      title="Re-fetch GraphQL schema from the server"
      :onClick="refreshSchema"
      :styles="refreshStyles"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useExtensionState } from '@/contentScript/composables/useExtensionState'
import BetterButton from './BetterButton.vue'

const { isPaneOpen } = useExtensionState()

const togglePane = () => {
  isPaneOpen.value = !isPaneOpen.value
}

const refreshLabel = ref('Refresh Schema')
const refreshStyles: Record<string, string> = {
  border: '1px solid #ccc',
  padding: '3px 8px',
}

const refreshSchema = () => {
  refreshLabel.value = 'Refreshing...'
  window.postMessage({ type: 'BHH_REFRESH_SCHEMA' }, '*')
}

const handleMessage = (e: MessageEvent) => {
  if (e.source !== window) return
  if (e.data.type === 'BHH_SCHEMA_REFRESHED') {
    refreshLabel.value = e.data.success ? 'Refresh Schema' : 'Failed'
    setTimeout(() => {
      refreshLabel.value = 'Refresh Schema'
    }, 2000)
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<style scoped>
.toolbar-buttons {
  display: inline-flex;
  align-items: center;
}
</style>
