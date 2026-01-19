<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

interface Settings {
  extensionEnabled: boolean
  showOriginalHistory: boolean
}

const settings = ref<Settings>({
  extensionEnabled: true,
  showOriginalHistory: false,
})

onMounted(() => {
  chrome.storage.local.get(['settings'], (result) => {
    if (result.settings) {
      settings.value = { ...settings.value, ...result.settings }
    } else {
      // Set default settings if none are found
      chrome.storage.local.set({ settings: settings.value })
    }
  })
})

watch(
  settings,
  (newSettings) => {
    chrome.storage.local.set({ settings: newSettings })
  },
  { deep: true },
)
</script>

<template>
  <main>
    <div class="header">
      <img src="../assets/logo.png" alt="Logo" class="logo" />
      <h1>Better Hasura History</h1>
    </div>

    <div class="settings-container">
      <div class="setting">
        <label for="enable-extension">Enable Extension</label>
        <label class="switch">
          <input type="checkbox" id="enable-extension" v-model="settings.extensionEnabled" />
          <span class="slider round"></span>
        </label>
      </div>
      <div class="setting">
        <label for="show-original-history">Show Original History</label>
        <label class="switch">
          <input
            type="checkbox"
            id="show-original-history"
            v-model="settings.showOriginalHistory"
            :disabled="!settings.extensionEnabled"
          />
          <span class="slider round"></span>
        </label>
      </div>
    </div>
  </main>
</template>

<style>
:root {
  --primary-color: #2dbbe1;
  --background-color: #1a202c;
  --text-color: #e2e8f0;
  --card-background-color: #2d3748;
  --disabled-color: #4a5568;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
  margin: 0;
  min-width: 320px;
}

main {
  padding: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.logo {
  width: 36px;
  height: 36px;
  margin-right: 12px;
}

h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--primary-color);
}

.settings-container {
  background-color: var(--card-background-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting label {
  font-size: 1rem;
}

.setting input[type='checkbox']:disabled + .slider {
  background-color: var(--disabled-color);
  cursor: not-allowed;
}

.setting input[type='checkbox']:disabled ~ .slider {
  background-color: #ccc;
}
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #4a5568;
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
