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

const activeTab = ref<'settings' | 'connection'>('settings')

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
    <header class="app-header">
      <img src="../assets/logo.png" alt="Logo" class="logo" />
      <h1>Better Hasura History</h1>
    </header>

    <div class="tab-bar">
      <button
        class="tab"
        :class="{ active: activeTab === 'settings' }"
        @click="activeTab = 'settings'"
      >
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        Settings
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'connection' }"
        @click="activeTab = 'connection'"
      >
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        Connection
      </button>
    </div>

    <div class="tab-content">
      <!-- Settings Tab -->
      <div v-if="activeTab === 'settings'" class="card">
        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-name">Enable Extension</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="enable-extension" v-model="settings.extensionEnabled" />
            <span class="slider round"></span>
          </label>
        </div>

        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-name">Show Original History</span>
          </div>
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

        <div class="setting-row">
          <div class="setting-label">
            <span class="setting-name">Root field name as fallback</span>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              id="use-root-field"
              v-model="settings.useRootFieldAsFallbackName"
              :disabled="!settings.extensionEnabled"
            />
            <span class="slider round"></span>
          </label>
        </div>
        <p class="field-description">Use root field as fallback name when operation is unnamed</p>

        <div class="field-group">
          <label for="log-level" class="field-label">Log Level</label>
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
          <p class="field-description">Higher levels reduce console noise.</p>
        </div>
      </div>

      <!-- Connection Tab -->
      <div v-if="activeTab === 'connection'" class="card">
        <!-- Per-host credentials section -->
        <template v-if="currentHost">
          <div class="section-header">
            <span class="section-title">{{ currentHost }}</span>
            <span class="section-badge">current</span>
          </div>

          <div class="field-group">
            <label :for="'host-endpoint-' + currentHost" class="field-label">GraphQL Endpoint</label>
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
            <p class="field-description">Per-host endpoint for {{ currentHost }}</p>
          </div>

          <div class="field-group">
            <label :for="'host-secret-' + currentHost" class="field-label">Admin Secret</label>
            <input
              :id="'host-secret-' + currentHost"
              type="password"
              class="text-input"
              :placeholder="'Enter admin secret for ' + currentHost"
              :value="currentHostConfig.adminSecret"
              @input="
                currentHostConfig = {
                  ...currentHostConfig,
                  adminSecret: ($event.target as HTMLInputElement).value,
                }
              "
            />
            <p class="field-description">Per-host admin secret for {{ currentHost }}</p>
          </div>

          <div class="field-group">
            <label :for="'host-source-' + currentHost" class="field-label">Database Source</label>
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
            <p class="field-description">
              Source name for fast Postgres queries (auto-discovered on first metadata fetch)
            </p>
          </div>

          <div class="section-divider"></div>
        </template>

        <!-- Global fallback credentials -->
        <div class="section-header">
          <span class="section-title">Global Fallback</span>
          <span class="section-badge">fallback</span>
        </div>

        <div class="field-group">
          <label for="graphql-endpoint" class="field-label">GraphQL Endpoint</label>
          <input
            type="text"
            id="graphql-endpoint"
            v-model="settings.graphqlEndpoint"
            class="text-input"
            placeholder="http://localhost:6083"
          />
          <p class="field-description">Fallback endpoint used when no per-host value is set</p>
        </div>

        <div class="field-group">
          <label for="admin-secret" class="field-label">Admin Secret</label>
          <input
            type="password"
            id="admin-secret"
            v-model="settings.adminSecret"
            class="text-input"
            placeholder="Enter admin secret"
          />
          <p class="field-description">Fallback admin secret used when no per-host value is set</p>
        </div>
      </div>
    </div>
  </main>
</template>

<style>
:root {
  --dusk-blue: #26547cff;
  --bubblegum-pink: #ef476fff;
  --golden-pollen: #ffd166ff;
  --emerald: #06d6a0ff;
  --porcelain: #fffcf9ff;
}

* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--porcelain);
  color: var(--dusk-blue);
  margin: 0;
  min-width: 320px;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

main {
  padding: 16px;
}

/* ── Header ── */
.app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-top: 4px;
}

.logo {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

h1 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: var(--dusk-blue);
  letter-spacing: -0.01em;
}

/* ── Tab Bar ── */
.tab-bar {
  display: flex;
  gap: 0;
  margin-bottom: 0;
  background: white;
  border-radius: 12px 12px 0 0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(38, 84, 124, 0.08);
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--dusk-blue);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: color 0.2s, background 0.2s;
  opacity: 0.55;
}

.tab:hover {
  opacity: 0.85;
  background: rgba(255, 209, 102, 0.08);
}

.tab.active {
  opacity: 1;
  color: var(--dusk-blue);
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 3px;
  background: var(--emerald);
  border-radius: 3px 3px 0 0;
}

.tab-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* ── Tab Content ── */
.tab-content {
  background: white;
  border-radius: 0 0 12px 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(38, 84, 124, 0.08);
}

.card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Setting Rows (toggles) ── */
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-label {
  display: flex;
  flex-direction: column;
}

.setting-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--dusk-blue);
}

/* ── Field Groups (inputs / selects) ── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--dusk-blue);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field-description {
  font-size: 0.75rem;
  color: var(--dusk-blue);
  opacity: 0.55;
  margin: 0;
  line-height: 1.4;
}

/* ── Section Headers ── */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--dusk-blue);
  letter-spacing: -0.01em;
}

.section-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(6, 214, 160, 0.12);
  color: var(--emerald);
}

.section-divider {
  height: 1px;
  background: rgba(38, 84, 124, 0.1);
  margin: 4px 0;
}

/* ── Text Inputs ── */
.text-input {
  width: 100%;
  background: var(--porcelain);
  color: var(--dusk-blue);
  border: 1.5px solid rgba(38, 84, 124, 0.15);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.text-input:focus {
  border-color: var(--golden-pollen);
  box-shadow: 0 0 0 3px rgba(255, 209, 102, 0.15);
}

.text-input::placeholder {
  color: var(--dusk-blue);
  opacity: 0.35;
}

.text-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Select Input ── */
.select-input {
  width: 100%;
  background: var(--porcelain);
  color: var(--dusk-blue);
  border: 1.5px solid rgba(38, 84, 124, 0.15);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2326547c' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.select-input:focus {
  border-color: var(--golden-pollen);
  box-shadow: 0 0 0 3px rgba(255, 209, 102, 0.15);
}

.select-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Toggle Switch ── */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
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
  background-color: rgba(38, 84, 124, 0.2);
  transition: background-color 0.25s ease;
}

.slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: transform 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

input:checked + .slider {
  background-color: var(--emerald);
}

input:focus-visible + .slider {
  box-shadow: 0 0 0 3px rgba(6, 214, 160, 0.25);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}

/* Disabled state for toggles */
input:disabled + .slider {
  opacity: 0.4;
  cursor: not-allowed;
}

input:checked:disabled + .slider {
  background-color: var(--emerald);
  opacity: 0.4;
}
</style>
