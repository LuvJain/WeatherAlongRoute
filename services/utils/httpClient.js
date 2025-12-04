/**
 * HTTP Client utility with retry and circuit breaker patterns
 */

import config from '../config';
import logger from './logger';

// Circuit breaker state
const circuitState = {
  isOpen: false,
  failureCount: 0,
  lastFailureTime: null,
  failureThreshold: 5, // Number of failures before circuit opens
  resetTimeout: 30000, // 30 seconds before trying to reset circuit
};

// Check if circuit is open
const isCircuitOpen = () => {
  // Check if enough time has passed to retry
  if (circuitState.isOpen && circuitState.lastFailureTime) {
    const now = Date.now();
    const timeSinceLastFailure = now - circuitState.lastFailureTime;

    // Reset circuit after timeout
    if (timeSinceLastFailure > circuitState.resetTimeout) {
      resetCircuit();
      return false;
    }

    return true;
  }

  return circuitState.isOpen;
};

// Record a failure
const recordFailure = () => {
  circuitState.failureCount += 1;
  circuitState.lastFailureTime = Date.now();

  // Open circuit if threshold exceeded
  if (circuitState.failureCount >= circuitState.failureThreshold) {
    circuitState.isOpen = true;
    logger.warn('Circuit breaker opened', {
      failureCount: circuitState.failureCount,
      lastFailureTime: circuitState.lastFailureTime
    });
  }
};

// Record a success
const recordSuccess = () => {
  // Reset the failure count if there was a successful request
  if (circuitState.failureCount > 0) {
    resetCircuit();
  }
};

// Reset the circuit
const resetCircuit = () => {
  circuitState.isOpen = false;
  circuitState.failureCount = 0;
  circuitState.lastFailureTime = null;
  logger.info('Circuit breaker reset');
};

/**
 * Fetch with timeout, retry, and circuit breaker
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {string} apiName - Name of the API (for logging)
 * @param {number} retryCount - Number of retries (default from config)
 * @param {number} timeout - Timeout in ms (default from config)
 * @returns {Promise<Object>} - The response data
 */
const fetchWithRetry = async (
  url,
  options = {},
  apiName = 'API',
  retryCount = config.RETRY_COUNT,
  timeout = config.TIMEOUT
) => {
  const startTime = Date.now();

  // Check if circuit is open
  if (isCircuitOpen()) {
    logger.error(`${apiName} request rejected (circuit open)`, {
      url,
      options: { ...options, headers: '[REDACTED]' },
    });
    throw new Error(`Circuit is open for ${apiName}`);
  }

  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${apiName} request timed out after ${timeout}ms`));
    }, timeout);
  });

  // Try the fetch with potential retries
  let lastError = null;
  let attempts = 0;

  while (attempts <= retryCount) {
    try {
      attempts += 1;

      // Race the fetch against the timeout
      const response = await Promise.race([
        fetch(url, options),
        timeoutPromise
      ]);

      // Check if the response is ok
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${apiName} request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Record the success for circuit breaker
      recordSuccess();

      // Log successful API performance
      const endTime = Date.now();
      logger.apiPerformance(apiName, startTime, endTime, true, {
        url,
        method: options.method || 'GET',
        attempts,
      });

      return data;
    } catch (error) {
      lastError = error;

      // Log the retry attempt
      logger.warn(`${apiName} request attempt ${attempts} failed`, {
        error: error.message,
        url,
        method: options.method || 'GET',
      });

      // If we've reached max retries, record failure and throw
      if (attempts > retryCount) {
        recordFailure();

        // Log failed API performance
        const endTime = Date.now();
        logger.apiPerformance(apiName, startTime, endTime, false, {
          url,
          method: options.method || 'GET',
          error: error.message,
          attempts,
        });

        throw error;
      }

      // Wait before retrying (with exponential backoff)
      await new Promise(resolve => setTimeout(
        resolve,
        config.RETRY_DELAY * Math.pow(2, attempts - 1)
      ));
    }
  }

  // Should never reach here, but just in case
  throw lastError;
};

export default {
  fetchWithRetry,
  isCircuitOpen,
  resetCircuit,
};