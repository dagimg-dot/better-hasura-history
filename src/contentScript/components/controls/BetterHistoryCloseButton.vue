<template>
  <button class="better-history-close-button" @click="isPaneOpen = false">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
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
</template>

<script lang="ts" setup>
import { useExtensionState } from '@/contentScript/composables/useExtensionState'

const { isPaneOpen } = useExtensionState()
</script>
