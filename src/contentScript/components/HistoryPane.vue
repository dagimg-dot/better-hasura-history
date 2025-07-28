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
  </div>
</template>

<script setup lang="ts">
import { state } from '../state'
</script>

<style scoped>
.better-history-pane {
  background: white;
  position: relative;
  display: block;
  min-width: 230px;
  z-index: 7;
  padding: 6.3px;
  border-bottom: 1px solid #e0e0e0;
}

.better-history-title-bar {
  cursor: default;
  display: flex;
  height: 34px;
  line-height: 14px;
  padding: 8px 8px 3px;
  position: relative;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
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
</style>
