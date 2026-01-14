/**
 * Logger utility for the application
 * Provides consistent logging across the application with different log levels
 */

import log from 'loglevel';

// Set the default log level based on environment
log.setLevel(process.env.NODE_ENV === 'production' ? 'warn' : 'info');

// Create a custom logger with additional metadata
const createLogger = (namespace) => ({
  trace: (message, data) => log.trace(`[${namespace}]`, message, data || ''),
  debug: (message, data) => log.debug(`[${namespace}]`, message, data || ''),
  info: (message, data) => log.info(`[${namespace}]`, message, data || ''),
  warn: (message, data) => log.warn(`[${namespace}]`, message, data || ''),
  error: (message, error) => {
    const errorObj = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    log.error(`[${namespace}]`, message, errorObj || '');
  },

  // API request logging
  logApiRequest: (method, url, params) => {
    log.debug(`[${namespace}] API Request`, { method, url, params });
  },

  // API response logging
  logApiResponse: (method, url, status, responseTime) => {
    log.info(`[${namespace}] API Response`, {
      method,
      url,
      status,
      responseTime: `${responseTime}ms`
    });
  },

  // API error logging
  logApiError: (method, url, error, responseTime) => {
    log.error(`[${namespace}] API Error`, {
      method,
      url,
      error: error?.message || error,
      responseTime: responseTime ? `${responseTime}ms` : undefined
    });
  }
});

// Create and export default logger instances
export const apiLogger = createLogger('API');
export const weatherLogger = createLogger('Weather');

// Export default logger instance
export default createLogger('App');