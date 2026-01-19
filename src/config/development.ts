export const developmentConfig = {
  logLevel: 'debug' as const,
  enableDevTools: true,
  apiEndpoint: 'http://localhost:3000',
  debugMode: true,
  maxHistoryItems: 50, // Lower for development
  storagePrefix: 'bhh_dev_',
}
