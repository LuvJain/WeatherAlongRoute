/**
 * Centralized logging service
 * In production, this can be connected to a remote logging service
 */

// Log levels
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

// Current log level (change this to control verbosity)
const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

// Convert log level to numeric value for comparison
const getLogLevelValue = (level) => {
  switch (level) {
    case LOG_LEVELS.DEBUG: return 0;
    case LOG_LEVELS.INFO: return 1;
    case LOG_LEVELS.WARN: return 2;
    case LOG_LEVELS.ERROR: return 3;
    default: return 1;
  }
};

// Check if a log level should be shown
const shouldLog = (level) => {
  return getLogLevelValue(level) >= getLogLevelValue(CURRENT_LOG_LEVEL);
};

// Format log message
const formatMessage = (level, message, data) => {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    level,
    message,
    data,
  };
};

// Log to console with JSON formatting
const logToConsole = (logObject) => {
  const { level } = logObject;

  // Format log differently based on level
  switch (level) {
    case LOG_LEVELS.DEBUG:
      console.debug(JSON.stringify(logObject));
      break;
    case LOG_LEVELS.INFO:
      console.info(JSON.stringify(logObject));
      break;
    case LOG_LEVELS.WARN:
      console.warn(JSON.stringify(logObject));
      break;
    case LOG_LEVELS.ERROR:
      console.error(JSON.stringify(logObject));
      break;
    default:
      console.log(JSON.stringify(logObject));
  }
};

// API Performance logging
const logApiPerformance = (apiName, startTime, endTime, success, requestData = {}) => {
  const duration = endTime - startTime;

  logger.info(`API Performance: ${apiName}`, {
    apiName,
    durationMs: duration,
    success,
    requestData: { ...requestData, sensitive: '[REDACTED]' }, // Redact sensitive data
  });
};

// Main logger object with methods for each log level
const logger = {
  debug: (message, data = {}) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      logToConsole(formatMessage(LOG_LEVELS.DEBUG, message, data));
    }
  },

  info: (message, data = {}) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      logToConsole(formatMessage(LOG_LEVELS.INFO, message, data));
    }
  },

  warn: (message, data = {}) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      logToConsole(formatMessage(LOG_LEVELS.WARN, message, data));
    }
  },

  error: (message, error, additionalData = {}) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      const errorData = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        ...additionalData
      } : error;

      logToConsole(formatMessage(LOG_LEVELS.ERROR, message, errorData));
    }
  },

  // API performance logging helper
  apiPerformance: logApiPerformance,
};

export default logger;