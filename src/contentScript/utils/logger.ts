import { logger as sharedLogger, type Logger } from '@/shared/logging'
import type { LogLevel } from '@/shared/logging/Logger'

/**
 * Logger for the content script that wraps the shared robust logger.
 * This ensures consistency across the extension while keeping the existing utility's interface.
 */
export const logger = {
  debug: (message: string, context?: Record<string, any>) => sharedLogger.debug(message, context),
  info: (message: string, context?: Record<string, any>) => sharedLogger.info(message, context),
  warn: (message: string, context?: Record<string, any>) => sharedLogger.warn(message, context),
  error: (message: string, error?: Error, context?: Record<string, any>) =>
    sharedLogger.error(message, error, context),
  setLogLevel: (level: LogLevel) => sharedLogger.setLogLevel(level),
  getLogLevel: () => sharedLogger.getLogLevel(),
}
