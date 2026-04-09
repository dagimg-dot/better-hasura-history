import Fuse from 'fuse.js'
import { useStorage } from '@vueuse/core'
import { logger } from '@/shared/logging'
import { SettingsManager } from './SettingsManager'

export interface TableInfo {
  schema: string
  table: string
  displayName: string
}

const tablesStorage = useStorage<TableInfo[]>('better-hasura-tables', [])

let fuseInstance: Fuse<TableInfo> | null = null

function getFuseInstance(): Fuse<TableInfo> {
  if (!fuseInstance) {
    fuseInstance = new Fuse(tablesStorage.value, {
      keys: ['displayName', 'schema', 'table'],
      threshold: 0.3,
      includeScore: true,
    })
  }
  return fuseInstance
}

function updateFuseIndex(): void {
  fuseInstance = null
  if (tablesStorage.value.length > 0) {
    getFuseInstance()
  }
}

export const TableService = {
  getTables(): TableInfo[] {
    return tablesStorage.value
  },

  hasTables(): boolean {
    return tablesStorage.value.length > 0
  },

  search(query: string): TableInfo[] {
    if (!query.trim()) {
      return tablesStorage.value
    }
    const results = getFuseInstance().search(query)
    return results.map((r) => r.item)
  },

  async fetchTables(): Promise<void> {
    const settings = await SettingsManager.getSettings()
    const { adminSecret, graphqlEndpoint } = settings

    logger.debug('fetchTables called', { hasAdminSecret: !!adminSecret, graphqlEndpoint })

    if (!adminSecret || !graphqlEndpoint) {
      logger.warn('Cannot fetch tables: admin secret or GraphQL endpoint not configured')
      return
    }

    const url = `${graphqlEndpoint}/v1/metadata`
    logger.debug('Fetching tables from', { url })

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          type: 'export_metadata',
          args: {},
        }),
      })

      logger.debug('Response status:', { status: response.status, statusText: response.statusText })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      logger.debug('Full response structure:', {
        hasData: !!data,
        hasMetadata: !!data?.metadata,
        hasSources: !!data?.sources,
        metadataSources: data?.metadata?.sources,
      })

      const tables: TableInfo[] = []

      // Handle both wrapped (metadata.sources) and direct (sources) response formats
      const sources = data.metadata?.sources || data.sources

      if (sources?.[0]?.tables) {
        logger.debug('Found tables in metadata:', { count: sources[0].tables.length })
        for (const t of sources[0].tables) {
          const schema = t.table?.schema || 'public'
          const table = t.table?.name
          if (table) {
            tables.push({
              schema,
              table,
              displayName: `${schema}.${table}`,
            })
          }
        }
      } else {
        logger.warn('No tables found in response', { data })
      }

      tablesStorage.value = tables
      updateFuseIndex()
      logger.debug(`Fetched ${tables.length} tables`)
    } catch (error) {
      logger.error('Failed to fetch tables', error as Error)
    }
  },

  async refreshTables(): Promise<void> {
    logger.debug('Refreshing tables...')
    await this.fetchTables()
  },

  clearTables(): void {
    tablesStorage.value = []
    fuseInstance = null
  },
}
