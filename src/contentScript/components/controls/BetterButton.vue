<template>
  <button class="better-button" :title="title" :style="mergedStyles" @click="onClick">
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    title: string
    onClick: () => void
    styles?: Record<string, string>
  }>(),
  { styles: () => ({}) },
)

const defaultStyles: Record<string, string> = {
  backgroundColor: '#fdfdfd',
  background: 'linear-gradient(#f9f9f9, #ececec)',
  border: '0',
  borderRadius: '3px',
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.7), inset 0 1px #fff',
  color: '#555 !important',
  cursor: 'pointer',
  display: 'inline-block',
  margin: '0 5px',
  padding: '3px 11px 5px',
  textDecoration: 'none',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '150px',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontWeight: '400',
}

const mergedStyles = computed(() => ({ ...defaultStyles, ...props.styles }))
</script>
