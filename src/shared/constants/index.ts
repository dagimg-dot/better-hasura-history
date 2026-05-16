export const EXTENSION_CONFIG = {
  NAME: 'Better Hasura History',
  VERSION: '0.2.0',
  STORAGE_KEYS: {
    HISTORY: 'bhh_history',
    SETTINGS: 'bhh_settings',
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
  CSS_CLASSES: {
    BUTTON_CONTAINER: 'bhh-button-container',
    PANE_CONTAINER: 'bhh-pane-container',
    HISTORY_ITEM: 'bhh-history-item',
  },
  DEFAULTS: {
    MAX_HISTORY_ITEMS: 100,
    AUTO_SAVE: true,
    SHOW_TIMESTAMPS: true,
    THEME: 'auto' as const,
  },
} as const

export const OPERATION_TYPES = {
  QUERY: 'query',
  MUTATION: 'mutation',
  SUBSCRIPTION: 'subscription',
} as const

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
} as const
