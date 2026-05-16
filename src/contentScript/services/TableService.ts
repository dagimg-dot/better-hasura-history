import Fuse from 'fuse.js'
import { useStorage } from '@vueuse/core'
import { logger } from '@/shared/logging'
import { SettingsManager } from './SettingsManager'

export interface TableInfo {
  schema: string
  table: string
  displayName: string
  lastAccessed?: number
}

const tablesStorage = useStorage<TableInfo[]>('better-hasura-tables', [])
const RECENCY_DECAY_HOURS = 24 * 7 // 7 days for half-life
const RECENCY_DECAY_MS = RECENCY_DECAY_HOURS * 60 * 60 * 1000

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

function calculateRecencyScore(lastAccessed: number): number {
  const now = Date.now()
  const age = now - lastAccessed
  const halfLife = RECENCY_DECAY_MS
  return Math.pow(0.5, age / halfLife)
}

function sortByRecency(tables: TableInfo[]): TableInfo[] {
  return [...tables].sort((a, b) => {
    const scoreA = a.lastAccessed ? calculateRecencyScore(a.lastAccessed) : 0
    const scoreB = b.lastAccessed ? calculateRecencyScore(b.lastAccessed) : 0
    return scoreB - scoreA
  })
}

function updateFuseIndex(): void {
  fuseInstance = null
  if (tablesStorage.value.length > 0) {
    getFuseInstance()
  }
}

export const TableService = {
  getTables(): TableInfo[] {
    return sortByRecency(tablesStorage.value)
  },

  hasTables(): boolean {
    return tablesStorage.value.length > 0
  },

  search(query: string): TableInfo[] {
    if (!query.trim()) {
      return sortByRecency(tablesStorage.value)
    }
    const results = getFuseInstance().search(query)
    const matchedTables = results.map((r) => r.item)
    return sortByRecency(matchedTables)
  },

  markAccessed(displayName: string): void {
    const tables = tablesStorage.value
    const index = tables.findIndex((t) => t.displayName === displayName)
    if (index !== -1) {
      tables[index].lastAccessed = Date.now()
      tablesStorage.value = [...tables]
    }
  },

  async fetchTables(): Promise<void> {
    const settings = await SettingsManager.getCurrentHostSettings()
    const { adminSecret, graphqlEndpoint } = settings

    logger.debug('fetchTables called', { hasAdminSecret: !!adminSecret, graphqlEndpoint })

    if (!adminSecret || !graphqlEndpoint) {
      logger.warn('Cannot fetch tables: admin secret or GraphQL endpoint not configured')
      return
    }

    const existingLastAccessed = new Map<string, number>()
    for (const t of tablesStorage.value) {
      if (t.lastAccessed) existingLastAccessed.set(t.displayName, t.lastAccessed)
    }

    const hostname = SettingsManager.getCurrentHost()
    const allSettings = await SettingsManager.getSettings()
    const configuredSource = allSettings.hosts?.[hostname]?.source
    const source = configuredSource || 'default'

    let tables: TableInfo[] | null = null

    try {
      const sql =
        "SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema NOT IN ('information_schema','pg_catalog','hdb_catalog','hdb_views') AND table_type = 'BASE TABLE' ORDER BY table_schema, table_name"

      logger.debug('fetchTables: trying run_sql', { source })
      const runSqlResponse = await fetch(`${graphqlEndpoint}/v2/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          type: 'run_sql',
          args: { source, sql, read_only: true },
        }),
      })

      if (runSqlResponse.ok) {
        const runSqlData = await runSqlResponse.json()
        if (runSqlData.result_type === 'TuplesOk') {
          tables = runSqlData.result.slice(1).map((row: string[]) => {
            const schema = row[1] || 'public'
            return { schema, table: row[0], displayName: `${schema}.${row[0]}` }
          })
          logger.debug(`fetchTables: fetched ${tables!.length} tables via run_sql`)
        }
      }
    } catch (error) {
      logger.debug(
        'fetchTables: run_sql failed, falling back',
        error instanceof Error ? { error: error.message } : {},
      )
    }

    if (!tables) {
      try {
        logger.debug('fetchTables: falling back to export_metadata')
        const metadataResponse = await fetch(`${graphqlEndpoint}/v1/metadata`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': adminSecret,
          },
          body: JSON.stringify({ type: 'export_metadata', args: {} }),
        })

        if (!metadataResponse.ok) {
          const errorText = await metadataResponse.text()
          throw new Error(
            `HTTP ${metadataResponse.status}: ${metadataResponse.statusText} - ${errorText}`,
          )
        }

        const data = await metadataResponse.json()

        const sources = data.metadata?.sources || data.sources
        const metadataSourceName = sources?.[0]?.name

        if (sources?.[0]?.tables) {
          tables = []
          for (const t of sources[0].tables) {
            const schema = t.table?.schema || 'public'
            const table = t.table?.name
            if (table) {
              const displayName = `${schema}.${table}`
              tables.push({ schema, table, displayName })
            }
          }
          logger.debug(`fetchTables: fetched ${tables.length} tables via export_metadata`)
        }

        if (metadataSourceName && metadataSourceName !== configuredSource) {
          logger.debug('fetchTables: discovered source name', { metadataSourceName })
          SettingsManager.saveHostSettings(hostname, { source: metadataSourceName }).catch(
            (err) => {
              logger.error('Failed to save discovered source name', err as Error)
            },
          )
        }
      } catch (error) {
        logger.error('Failed to fetch tables', error as Error)
        return
      }
    }

    if (!tables) return

    for (const t of tables) {
      const preserved = existingLastAccessed.get(t.displayName)
      if (preserved) t.lastAccessed = preserved
    }

    tablesStorage.value = tables
    updateFuseIndex()
    logger.debug(`Fetched ${tables.length} tables`)
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
