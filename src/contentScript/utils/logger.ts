export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

const LOG_PREFIX = '[Better Hasura History]'

// Vite exposes the build mode in `import.meta.env.MODE`.
// We'll default to logging everything in development and only info and above in production.
const CURRENT_LOG_LEVEL = import.meta.env.MODE === 'development' ? LogLevel.DEBUG : LogLevel.INFO

function performLog(level: LogLevel, consoleMethod: (...data: any[]) => void, ...args: any[]) {
  if (level >= CURRENT_LOG_LEVEL) {
    consoleMethod(LOG_PREFIX, ...args)
  }
}
/**
 * Logger for the content script.
 * @param args - The arguments to log.
 * @returns void
 */
export const logger = {
  debug: (...args: any[]) => performLog(LogLevel.DEBUG, console.debug, ...args),
  info: (...args: any[]) => performLog(LogLevel.INFO, console.info, ...args),
  warn: (...args: any[]) => performLog(LogLevel.WARN, console.warn, ...args),
  error: (...args: any[]) => performLog(LogLevel.ERROR, console.error, ...args),
}
