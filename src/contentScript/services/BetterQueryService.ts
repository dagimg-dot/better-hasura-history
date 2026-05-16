import { logger } from '@/shared/logging'
import { SettingsManager } from './SettingsManager'
import { TableService, type TableInfo } from './TableService'

export interface ColumnInfo {
  schema: string
  table: string
  column: string
  dataType: string
}

export interface SearchResult {
  tableDisplayName: string
  schema: string
  table: string
  column: string
  matchCount: number
}

export type SearchMode = 'contains' | 'exact' | 'startsWith' | 'endsWith'

export const SEARCH_MODE_OPTIONS: Array<{ value: SearchMode; label: string }> = [
  { value: 'contains', label: 'Contains' },
  { value: 'exact', label: 'Exact' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
]

function escapeSql(value: string): string {
  return value.replace(/'/g, "''")
}

function buildWhere(col: string, key: string, mode: SearchMode): string {
  const k = escapeSql(key)
  switch (mode) {
    case 'contains':
      return `"${col}"::text ILIKE '%${k}%'`
    case 'exact':
      return `"${col}"::text = '${k}'`
    case 'startsWith':
      return `"${col}"::text ILIKE '${k}%'`
    case 'endsWith':
      return `"${col}"::text ILIKE '%${k}'`
  }
}

function buildFilter(column: string, key: string, mode: SearchMode): string {
  const v = encodeURIComponent(key)
  switch (mode) {
    case 'contains':
      return `${column}%3B%24like%3B%25${v}%25`
    case 'exact':
      return `${column}%3B%24eq%3B${v}`
    case 'startsWith':
      return `${column}%3B%24like%3B${v}%25`
    case 'endsWith':
      return `${column}%3B%24like%3B%25${v}`
  }
}

const CACHE_TTL_MS = 60_000
const BATCH_SIZE = 6

interface CacheEntry {
  columns: ColumnInfo[]
  tableVersion: number
  timestamp: number
}

const columnCache = new Map<string, CacheEntry>()

function getTableVersion(): number {
  return TableService.getTables().length
}

export const BetterQueryService = {
  async findMatchingColumns(regex: string): Promise<ColumnInfo[]> {
    const settings = await SettingsManager.getCurrentHostSettings()
    const hostname = SettingsManager.getCurrentHost()
    const allSettings = await SettingsManager.getSettings()
    const hostConfig = allSettings.hosts?.[hostname]
    const source = hostConfig?.source || 'default'

    if (!settings.adminSecret || !settings.graphqlEndpoint) {
      throw new Error('Credentials not configured')
    }

    const trackedTables = TableService.getTables()
    if (trackedTables.length === 0) {
      throw new Error('No tracked tables found. Try refreshing tables first.')
    }

    const cacheKey = regex.trim().toLowerCase()
    const tableVersion = getTableVersion()
    const cached = columnCache.get(cacheKey)
    if (
      cached &&
      cached.tableVersion === tableVersion &&
      Date.now() - cached.timestamp < CACHE_TTL_MS
    ) {
      logger.debug('BetterQuery: column discovery cache hit')
      return cached.columns
    }

    const trackedSet = new Set(trackedTables.map((t: TableInfo) => `${t.schema}.${t.table}`))

    const schemas = [...new Set(trackedTables.map((t: TableInfo) => t.schema))]
    const schemaFilter = schemas.map((s) => `'${escapeSql(s)}'`).join(', ')

    const escapedRegex = escapeSql(regex)
    const sql = `SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema IN (${schemaFilter}) AND column_name ~ '${escapedRegex}' ORDER BY table_schema, table_name, ordinal_position`

    const response = await fetch(`${settings.graphqlEndpoint}/v2/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': settings.adminSecret,
      },
      body: JSON.stringify({
        type: 'run_sql',
        args: { source, sql, read_only: true },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`run_sql failed (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    if (data.result_type !== 'TuplesOk') {
      throw new Error('run_sql did not return TuplesOk')
    }

    const columns: ColumnInfo[] = data.result
      .slice(1)
      .map((row: string[]) => ({
        schema: row[0],
        table: row[1],
        column: row[2],
        dataType: row[3],
      }))
      .filter((col: ColumnInfo) => trackedSet.has(`${col.schema}.${col.table}`))

    logger.debug(
      `BetterQuery: found ${columns.length} matching columns across ${new Set(columns.map((c: ColumnInfo) => `${c.schema}.${c.table}`)).size} tracked tables`,
    )

    columnCache.set(cacheKey, { columns, tableVersion, timestamp: Date.now() })

    return columns
  },

  async searchInTables(
    key: string,
    columns: ColumnInfo[],
    mode: SearchMode,
  ): Promise<SearchResult[]> {
    const settings = await SettingsManager.getCurrentHostSettings()
    const hostname = SettingsManager.getCurrentHost()
    const allSettings = await SettingsManager.getSettings()
    const hostConfig = allSettings.hosts?.[hostname]
    const source = hostConfig?.source || 'default'

    if (!settings.adminSecret || !settings.graphqlEndpoint) {
      throw new Error('Credentials not configured')
    }

    const tableGroups = new Map<string, ColumnInfo[]>()
    for (const col of columns) {
      const tableKey = `${col.schema}.${col.table}`
      if (!tableGroups.has(tableKey)) {
        tableGroups.set(tableKey, [])
      }
      tableGroups.get(tableKey)!.push(col)
    }

    logger.debug(`BetterQuery: searching in ${tableGroups.size} tables`)

    const queries: Array<{ schema: string; table: string; sql: string }> = []

    for (const [tableKey, cols] of tableGroups) {
      const [schema, table] = tableKey.split('.')
      const unionParts = cols.map(
        (col) =>
          `SELECT '${escapeSql(col.column)}'::text AS column_name, COUNT(*)::int AS match_count FROM "${schema}"."${table}" WHERE ${buildWhere(col.column, key, mode)}`,
      )

      const sql = `SELECT column_name, match_count FROM (\n${unionParts.join('\nUNION ALL\n')}\n) sub WHERE match_count > 0`

      queries.push({ schema, table, sql })
    }

    const results = await Promise.allSettled(
      queries.map((q) =>
        fetch(`${settings.graphqlEndpoint}/v2/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': settings.adminSecret,
          },
          body: JSON.stringify({
            type: 'run_sql',
            args: { source, sql: q.sql, read_only: true },
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text()
            throw new Error(`HTTP ${res.status}: ${errorText}`)
          }
          const data = await res.json()
          if (data.result_type !== 'TuplesOk') {
            throw new Error('Unexpected response format')
          }
          const rows = data.result.slice(1) as string[][]
          return rows.map((row: string[]) => ({
            tableDisplayName: `${q.schema}.${q.table}`,
            schema: q.schema,
            table: q.table,
            column: row[0],
            matchCount: parseInt(row[1], 10),
          }))
        }),
      ),
    )

    const searchResults: SearchResult[] = []
    let failures = 0

    for (const result of results) {
      if (result.status === 'fulfilled') {
        searchResults.push(...result.value)
      } else {
        failures++
        logger.error('BetterQuery: table search query failed', result.reason as Error)
      }
    }

    logger.debug(
      `BetterQuery: search complete — ${searchResults.length} column matches (${failures} query failures)`,
    )
    return searchResults
  },

  async searchInTablesBatched(
    key: string,
    columns: ColumnInfo[],
    mode: SearchMode,
    onBatch: (results: SearchResult[]) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    const settings = await SettingsManager.getCurrentHostSettings()
    const hostname = SettingsManager.getCurrentHost()
    const allSettings = await SettingsManager.getSettings()
    const hostConfig = allSettings.hosts?.[hostname]
    const source = hostConfig?.source || 'default'

    if (!settings.adminSecret || !settings.graphqlEndpoint) {
      throw new Error('Credentials not configured')
    }

    const tableGroups = new Map<string, ColumnInfo[]>()
    for (const col of columns) {
      const tableKey = `${col.schema}.${col.table}`
      if (!tableGroups.has(tableKey)) {
        tableGroups.set(tableKey, [])
      }
      tableGroups.get(tableKey)!.push(col)
    }

    const tableEntries = Array.from(tableGroups.entries()).map(([tableKey, cols]) => {
      const [schema, table] = tableKey.split('.')
      return { schema, table, cols }
    })

    const batches: Array<typeof tableEntries> = []
    for (let i = 0; i < tableEntries.length; i += BATCH_SIZE) {
      batches.push(tableEntries.slice(i, i + BATCH_SIZE))
    }

    logger.debug(
      `BetterQuery: searching ${tableEntries.length} tables in ${batches.length} batch(es) of ${BATCH_SIZE}`,
    )

    if (batches.length === 0) return

    const promises = batches.map((batch) => {
      const unionParts = batch.flatMap(({ schema, table, cols }) =>
        cols.map(
          (col) =>
            `SELECT '${escapeSql(schema)}'::text AS _schema, '${escapeSql(table)}'::text AS _table, '${escapeSql(col.column)}'::text AS column_name, COUNT(*)::int AS match_count FROM "${schema}"."${table}" WHERE ${buildWhere(col.column, key, mode)}`,
        ),
      )

      const sql = `SELECT _schema, _table, column_name, match_count FROM (\n${unionParts.join('\nUNION ALL\n')}\n) sub WHERE match_count > 0`

      return fetch(`${settings.graphqlEndpoint}/v2/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': settings.adminSecret,
        },
        body: JSON.stringify({
          type: 'run_sql',
          args: { source, sql, read_only: true },
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text()
            throw new Error(`HTTP ${res.status}: ${errorText}`)
          }
          const data = await res.json()
          if (data.result_type !== 'TuplesOk') {
            throw new Error('Unexpected response format')
          }
          const rows = data.result.slice(1) as string[][]
          const results: SearchResult[] = rows.map((row: string[]) => ({
            tableDisplayName: `${row[0]}.${row[1]}`,
            schema: row[0],
            table: row[1],
            column: row[2],
            matchCount: parseInt(row[3], 10),
          }))
          onBatch(results)
        })
        .catch((err) => {
          onError(err instanceof Error ? err : new Error(String(err)))
        })
    })

    await Promise.allSettled(promises)
  },

  buildBrowseUrl(result: SearchResult, key: string, mode: SearchMode, origin: string): string {
    return `${origin}/console/data/default/schema/${result.schema}/tables/${result.table}/browse?filter=${buildFilter(result.column, key, mode)}`
  },
}
