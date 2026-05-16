<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { HostConfig, Settings } from '@/contentScript/services/SettingsManager'

const settings = ref<Settings>({
  extensionEnabled: true,
  showOriginalHistory: false,
  useRootFieldAsFallbackName: false,
  logLevel: 'info',
  adminSecret: '',
  graphqlEndpoint: '',
  hosts: {},
})

const currentHost = ref('')

const currentHostConfig = computed({
  get: (): HostConfig => {
    const host = currentHost.value
    if (!host) return { adminSecret: '', graphqlEndpoint: '' }
    return settings.value.hosts?.[host] ?? { adminSecret: '', graphqlEndpoint: '' }
  },
  set: (config: HostConfig) => {
    const host = currentHost.value
    if (!host) return
    if (!settings.value.hosts) {
      settings.value.hosts = {}
    }
    settings.value.hosts[host] = config
  },
})

onMounted(() => {
  chrome.storage.local.get(['settings'], (result) => {
    if (result.settings) {
      settings.value = { ...settings.value, ...result.settings }
    } else {
      chrome.storage.local.set({ settings: settings.value })
    }

    // Detect current tab hostname
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.url) return
      try {
        const url = new URL(tab.url)
        const host = url.port ? `${url.hostname}:${url.port}` : url.hostname

        // Only show per-host section for http/https URLs
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return

        currentHost.value = host

        // Auto-init host config with URL origin as endpoint if not yet set
        if (!settings.value.hosts?.[host]) {
          if (!settings.value.hosts) {
            settings.value.hosts = {}
          }
          settings.value.hosts[host] = {
            adminSecret: '',
            graphqlEndpoint: url.origin,
          }
        }
      } catch {
        // Invalid URL — skip
      }
    })
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
      <div class="setting setting-with-desc">
        <label for="use-root-field">Root field name as fallback</label>
        <label class="switch">
          <input
            type="checkbox"
            id="use-root-field"
            v-model="settings.useRootFieldAsFallbackName"
            :disabled="!settings.extensionEnabled"
          />
          <span class="slider round"></span>
        </label>
        <p class="description">Use root field as fallback name when operation is unnamed</p>
      </div>

      <div class="setting-col">
        <label for="log-level">Log Level</label>
        <select
          id="log-level"
          v-model="settings.logLevel"
          class="select-input"
          :disabled="!settings.extensionEnabled"
        >
          <option value="debug">Debug (All logs)</option>
          <option value="info">Info (Essential)</option>
          <option value="warn">Warn (Only warnings)</option>
          <option value="error">Error (Only errors)</option>
        </select>
        <p class="description">Higher levels reduce console noise.</p>
      </div>

      <!-- Per-host credentials section -->
      <template v-if="currentHost">
        <div class="section-divider">
          <span class="section-label">{{ currentHost }}</span>
        </div>

        <div class="setting-col">
          <label :for="'host-endpoint-' + currentHost">GraphQL Endpoint</label>
          <input
            :id="'host-endpoint-' + currentHost"
            type="text"
            class="text-input"
            :placeholder="'http://' + currentHost"
            :value="currentHostConfig.graphqlEndpoint"
            @input="
              currentHostConfig = {
                ...currentHostConfig,
                graphqlEndpoint: ($event.target as HTMLInputElement).value,
              }
            "
          />
          <p class="description">Per-host endpoint for {{ currentHost }}</p>
        </div>

        <div class="setting-col">
          <label :for="'host-secret-' + currentHost">Admin Secret</label>
          <input
            :id="'host-secret-' + currentHost"
            type="password"
            class="text-input"
            placeholder="Enter admin secret for {{ currentHost }}"
            :value="currentHostConfig.adminSecret"
            @input="
              currentHostConfig = {
                ...currentHostConfig,
                adminSecret: ($event.target as HTMLInputElement).value,
              }
            "
          />
          <p class="description">Per-host admin secret for {{ currentHost }}</p>
        </div>

        <div class="setting-col">
          <label :for="'host-source-' + currentHost">Database Source</label>
          <input
            :id="'host-source-' + currentHost"
            type="text"
            class="text-input"
            placeholder="default"
            :value="currentHostConfig.source ?? ''"
            @input="
              currentHostConfig = {
                ...currentHostConfig,
                source: ($event.target as HTMLInputElement).value,
              }
            "
          />
          <p class="description">
            Source name for fast Postgres queries (auto-discovered on first metadata fetch)
          </p>
        </div>
      </template>

      <!-- Global fallback credentials -->
      <div class="section-divider">
        <span class="section-label">Global Fallback</span>
      </div>

      <div class="setting-col">
        <label for="graphql-endpoint">GraphQL Endpoint</label>
        <input
          type="text"
          id="graphql-endpoint"
          v-model="settings.graphqlEndpoint"
          class="text-input"
          placeholder="http://localhost:6083"
        />
        <p class="description">Fallback endpoint used when no per-host value is set</p>
      </div>

      <div class="setting-col">
        <label for="admin-secret">Admin Secret</label>
        <input
          type="password"
          id="admin-secret"
          v-model="settings.adminSecret"
          class="text-input"
          placeholder="Enter admin secret"
        />
        <p class="description">Fallback admin secret used when no per-host value is set</p>
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

.setting-with-desc {
  flex-wrap: wrap;
}

.setting-with-desc .description {
  flex: 0 0 100%;
  margin-top: 2px;
}

.setting label {
  font-size: 1rem;
}

.setting-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-col label {
  font-size: 1rem;
}

.select-input {
  background-color: #4a5568;
  color: white;
  border: 1px solid #718096;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 0.9rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.select-input:focus {
  border-color: var(--primary-color);
}

.select-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-input {
  background-color: #4a5568;
  color: white;
  border: 1px solid #718096;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.text-input:focus {
  border-color: var(--primary-color);
}

.section-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: #4a5568;
}

.section-label {
  font-size: 0.75rem;
  color: #a0aec0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.description {
  font-size: 0.75rem;
  color: #a0aec0;
  margin: 0;
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
