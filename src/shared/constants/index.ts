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
