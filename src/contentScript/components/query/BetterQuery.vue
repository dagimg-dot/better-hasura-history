<template>
  <div class="better-query-container">
    <div class="better-query-title">Better Query</div>

    <div class="better-query-row">
      <input
        v-model="keyInput"
        type="text"
        placeholder="Search key..."
        @keydown.enter="handleSearch"
      />
      <input
        v-model="regexInput"
        type="text"
        placeholder="Column regex..."
        @keydown.enter="handleSearch"
      />
      <select v-model="searchMode">
        <option v-for="opt in SEARCH_MODE_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button
        class="better-query-search-btn"
        :disabled="isSearching || !keyInput || !regexInput"
        @click="handleSearch"
      >
        {{ isSearching ? 'Searching...' : 'Search' }}
      </button>
    </div>

    <div v-if="isSearching" class="better-query-loading">
      <i class="fa fa-spinner fa-spin"></i> Scanning tracked tables...
    </div>

    <div v-else-if="error" class="better-query-error">{{ error }}</div>

    <div v-else-if="results.length > 0" class="better-query-results">
      <div class="better-query-results-summary">
        Found {{ totalMatchCount }} match{{ totalMatchCount !== 1 ? 'es' : '' }} across
        {{ groupedResults.length }} table{{ groupedResults.length !== 1 ? 's' : '' }}
      </div>
      <div v-for="(group, idx) in groupedResults" :key="idx" class="better-query-table-group">
        <div class="better-query-table-name">{{ group.tableDisplayName }}</div>
        <div v-for="(result, ridx) in group.results" :key="ridx" class="better-query-result-row">
          <span class="better-query-column">{{ result.column }}</span>
          <span class="better-query-count"
            >{{ result.matchCount }} match{{ result.matchCount !== 1 ? 'es' : '' }}</span
          >
          <button
            class="better-query-browse-btn"
            @click="navigateToTable(result)"
            title="Browse table with filter"
          >
            Browse
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="hasSearched && !isSearching" class="better-query-no-results">
      No matches found
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  BetterQueryService,
  SEARCH_MODE_OPTIONS,
  type SearchMode,
  type SearchResult,
} from '@/contentScript/services/BetterQueryService'
import { logger } from '@/shared/logging'

const keyInput = ref('')
const regexInput = ref('')
const searchMode = ref<SearchMode>('contains')
const isSearching = ref(false)
const hasSearched = ref(false)
const error = ref('')
const results = ref<SearchResult[]>([])

const totalMatchCount = computed(() => results.value.reduce((sum, r) => sum + r.matchCount, 0))

const groupedResults = computed(() => {
  const groups = new Map<string, SearchResult[]>()
  for (const r of results.value) {
    if (!groups.has(r.tableDisplayName)) {
      groups.set(r.tableDisplayName, [])
    }
    groups.get(r.tableDisplayName)!.push(r)
  }
  return Array.from(groups.entries()).map(([tableDisplayName, res]) => ({
    tableDisplayName,
    results: res,
  }))
})

async function handleSearch() {
  const key = keyInput.value.trim()
  const regex = regexInput.value.trim()
  if (!key || !regex) return

  isSearching.value = true
  error.value = ''
  hasSearched.value = false
  results.value = []

  try {
    const columns = await BetterQueryService.findMatchingColumns(regex)
    if (columns.length === 0) {
      hasSearched.value = true
      isSearching.value = false
      return
    }

    const searchResults = await BetterQueryService.searchInTables(key, columns, searchMode.value)
    results.value = searchResults
    hasSearched.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Search failed'
    logger.error('BetterQuery: search error', err as Error)
  } finally {
    isSearching.value = false
  }
}

function navigateToTable(result: SearchResult) {
  const url = BetterQueryService.buildBrowseUrl(
    result,
    keyInput.value.trim(),
    searchMode.value,
    window.location.origin,
  )
  window.open(url, '_blank')
}
</script>

<style scoped>
.better-query-container {
  padding: 8px 10px 10px 0;
}

.better-query-title {
  font-size: 20px;
  font-weight: 700;
  color: #555;
  margin-top: 8px;
  margin-bottom: 8px;
  padding: 0 0 6px 0;
}

.better-query-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.better-query-row input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background: transparent;
}

.better-query-row input:focus {
  border-color: #2dbbe1;
}

.better-query-row input::placeholder {
  color: #999;
}

.better-query-row select {
  flex-shrink: 0;
  padding: 5px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  background: white;
  color: #555;
  cursor: pointer;
  appearance: auto;
  -webkit-appearance: auto;
  -moz-appearance: auto;
}

.better-query-row select:focus {
  border-color: #2dbbe1;
}

.better-query-search-btn {
  padding: 5px 16px;
  background: linear-gradient(#f9f9f9, #ececec);
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  white-space: nowrap;
}

.better-query-search-btn:hover:not(:disabled) {
  background: linear-gradient(#f0f0f0, #e0e0e0);
}

.better-query-search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.better-query-loading {
  font-size: 12px;
  color: #888;
  padding: 8px 6px;
}

.better-query-loading i {
  margin-right: 6px;
}

.better-query-error {
  font-size: 12px;
  color: #d32f2f;
  padding: 8px 6px;
  background: #fef2f2;
  border: 1px solid #fee;
  border-radius: 4px;
}

.better-query-results {
  max-height: 400px;
  overflow-y: auto;
}

.better-query-results-summary {
  font-size: 11px;
  color: #888;
  padding: 4px 6px 8px;
}

.better-query-table-group {
  margin-bottom: 6px;
}

.better-query-table-name {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  padding: 4px 6px;
  background: #f5f5f5;
  border-radius: 3px;
}

.better-query-result-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 12px;
  font-size: 12px;
}

.better-query-result-row:hover {
  background: #fafafa;
}

.better-query-column {
  flex: 1;
  color: #333;
  font-family: monospace;
  font-size: 12px;
}

.better-query-count {
  color: #888;
  font-size: 11px;
  white-space: nowrap;
}

.better-query-browse-btn {
  padding: 2px 8px;
  font-size: 11px;
  background: linear-gradient(#f9f9f9, #ececec);
  border: 1px solid #ccc;
  border-radius: 3px;
  color: #555;
  cursor: pointer;
  white-space: nowrap;
}

.better-query-browse-btn:hover {
  background: linear-gradient(#f0f0f0, #e0e0e0);
}

.better-query-no-results {
  font-size: 12px;
  color: #888;
  padding: 8px 6px;
}
</style>
