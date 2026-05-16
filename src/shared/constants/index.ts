export const EXTENSION_CONFIG = {
  NAME: 'Better Hasura Console',
  // Version is managed in package.json and chrome.runtime.getManifest().version
  STORAGE_KEYS: {
    HISTORY: 'bhh_history',
    SETTINGS: 'bhh_settings',
    SESSIONS: 'bhh_sessions',
    GRAPHQL_HEADERS: 'apiExplorer:graphiqlHeaders',
  },
  DOM_SELECTORS: {
    GRAPHIQL_CONTAINER: '.graphiql-container',
    TOOLBAR: '.graphiql-toolbar',
    QUERY_EDITOR: '.graphiql-query-editor',
    RAW_SQL: '#raw_sql',
    VARIABLE_EDITOR_TITLE: 'variable-editor-title',
    HISTORY_BUTTON: '.toolbar-button[title="Show History"]',
    TABLE_LINKS: '[data-test="table-links"]',
    TABLE_SEARCH_INPUT: '.table-search-container input',
    HISTORY_SEARCH_INPUT: '.history-search-container input',
    EXECUTE_BUTTON: '.execute-button',
    RUN_SQL: '[data-test="run-sql"]',
  },
} as const

export const OPERATION_TYPES = {
  QUERY: 'query',
  MUTATION: 'mutation',
  SUBSCRIPTION: 'subscription',
} as const
