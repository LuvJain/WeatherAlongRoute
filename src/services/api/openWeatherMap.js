/**
 * OpenWeatherMap API Service
 * Handles requests to the OpenWeatherMap API
 */

import axios from 'axios';
import apiConfig from '../../config/api';
import cache from '../../utils/cache';
import { weatherLogger as logger } from '../../utils/logger';

// Create axios instance for OpenWeatherMap API
const openWeatherMapClient = axios.create({
  baseURL: apiConfig.openWeatherMap.baseUrl,
  timeout: 10000, // 10 seconds timeout
  params: {
    ...apiConfig.openWeatherMap.defaultParams,
    appid: apiConfig.openWeatherMap.apiKey, // API key for authentication
  },
});

// Add request interceptor for logging
openWeatherMapClient.interceptors.request.use(config => {
  const { method, url, params } = config;

  // Log API request (excluding API key for security)
  const logParams = { ...params };
  delete logParams.appid;

  logger.logApiRequest(method, url, logParams);
  config.metadata = { startTime: Date.now() };
  return config;
});

// Add response interceptor for logging and metrics
openWeatherMapClient.interceptors.response.use(
  response => {
    const { config, status } = response;
    const responseTime = Date.now() - config.metadata.startTime;

    logger.logApiResponse(config.method, config.url, status, responseTime);
    return response;
  },
  error => {
    const { config, response } = error;
    const responseTime = config && config.metadata ? Date.now() - config.metadata.startTime : undefined;

    logger.logApiError(
      config?.method || 'unknown',
      config?.url || 'unknown',
      error,
      responseTime
    );
    return Promise.reject(error);
  }
);

// OpenWeatherMap API service
const openWeatherMapService = {
  /**
   * Get current weather data by coordinates
   *
   * @param {number} lat - Latitude coordinate
   * @param {number} lon - Longitude coordinate
   * @param {object} options - Additional options
   * @param {boolean} options.useCache - Whether to use cached data (default: true)
   * @param {string} options.units - Units of measurement (metric, imperial, standard)
   * @param {string} options.lang - Response language
   * @returns {Promise<object>} - Weather data
   */
  async getWeatherByCoordinates(lat, lon, options = {}) {
    const { useCache = true, units, lang } = options;

    // Parameter validation
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new Error('Invalid coordinates. Both latitude and longitude must be numbers.');
    }

    try {
      // Generate cache key based on coordinates
      const cacheKey = cache.getWeatherCacheKey(lat, lon);

      // Check cache first if enabled
      if (useCache) {
        const cachedData = await cache.get(cacheKey);
        if (cachedData) {
          logger.info('Using cached weather data', { lat, lon });
          return cachedData;
        }
      }

      // Prepare request parameters
      const params = {
        lat,
        lon,
        ...(units && { units }),
        ...(lang && { lang }),
      };

      // Make API request
      const response = await openWeatherMapClient.get(
        apiConfig.openWeatherMap.endpoints.weather,
        { params }
      );

      // Cache successful response
      if (useCache && response.data) {
        await cache.set(
          cacheKey,
          response.data,
          apiConfig.cache.weatherDataTTL
        );
      }

      return response.data;
    } catch (error) {
      // Handle API errors
      if (error.response) {
        // The request was made and the server responded with an error status
        const { status, data } = error.response;

        if (status === 401) {
          throw new Error('Invalid OpenWeatherMap API key. Please check your API key configuration.');
        } else if (status === 404) {
          throw new Error('Weather data not found for the provided coordinates.');
        } else if (status === 429) {
          throw new Error('OpenWeatherMap API rate limit exceeded. Please try again later.');
        }

        // Generic error with status code
        throw new Error(`OpenWeatherMap API error (${status}): ${data.message || 'Unknown error'}`);
      }

      // Network errors, timeouts, etc.
      throw new Error(`Error fetching weather data: ${error.message}`);
    }
  },

  /**
   * Get weather forecast by coordinates
   *
   * @param {number} lat - Latitude coordinate
   * @param {number} lon - Longitude coordinate
   * @param {object} options - Additional options
   * @param {boolean} options.useCache - Whether to use cached data (default: true)
   * @param {string} options.units - Units of measurement (metric, imperial, standard)
   * @param {string} options.lang - Response language
   * @returns {Promise<object>} - Forecast data
   */
  async getForecastByCoordinates(lat, lon, options = {}) {
    const { useCache = true, units, lang } = options;

    // Parameter validation
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new Error('Invalid coordinates. Both latitude and longitude must be numbers.');
    }

    try {
      // Generate cache key
      const cacheKey = `${cache.getWeatherCacheKey(lat, lon)}_forecast`;

      // Check cache first if enabled
      if (useCache) {
        const cachedData = await cache.get(cacheKey);
        if (cachedData) {
          logger.info('Using cached forecast data', { lat, lon });
          return cachedData;
        }
      }

      // Prepare request parameters
      const params = {
        lat,
        lon,
        ...(units && { units }),
        ...(lang && { lang }),
      };

      // Make API request
      const response = await openWeatherMapClient.get(
        apiConfig.openWeatherMap.endpoints.forecast,
        { params }
      );

      // Cache successful response
      if (useCache && response.data) {
        await cache.set(
          cacheKey,
          response.data,
          apiConfig.cache.weatherDataTTL
        );
      }

      return response.data;
    } catch (error) {
      // Handle API errors (similar to getWeatherByCoordinates)
      if (error.response) {
        const { status, data } = error.response;

        if (status === 401) {
          throw new Error('Invalid OpenWeatherMap API key. Please check your API key configuration.');
        } else if (status === 404) {
          throw new Error('Forecast data not found for the provided coordinates.');
        } else if (status === 429) {
          throw new Error('OpenWeatherMap API rate limit exceeded. Please try again later.');
        }

        throw new Error(`OpenWeatherMap API error (${status}): ${data.message || 'Unknown error'}`);
      }

      throw new Error(`Error fetching forecast data: ${error.message}`);
    }
  },

  /**
   * Get weather for a route with multiple coordinates
   *
   * @param {Array<{lat: number, lon: number}>} coordinates - Array of coordinate points along the route
   * @param {object} options - Additional options
   * @returns {Promise<Array<object>>} - Array of weather data for each coordinate
   */
  async getWeatherForRoute(coordinates, options = {}) {
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      throw new Error('Invalid route coordinates. Must provide an array of {lat, lon} objects.');
    }

    // Sample coordinates based on distance if there are too many points
    const sampledCoordinates = this._sampleRouteCoordinates(coordinates, options.maxPoints || 5);

    logger.info(`Fetching weather for route with ${sampledCoordinates.length} points`);

    try {
      // Get weather for all sampled points along the route
      const weatherPromises = sampledCoordinates.map(({ lat, lon }) =>
        this.getWeatherByCoordinates(lat, lon, options)
      );

      return await Promise.all(weatherPromises);
    } catch (error) {
      logger.error('Error fetching route weather data', error);
      throw new Error(`Failed to get weather data for route: ${error.message}`);
    }
  },

  /**
   * Sample route coordinates to reduce the number of API calls
   * Private helper method
   *
   * @param {Array<{lat: number, lon: number}>} coordinates - Full coordinates array
   * @param {number} maxPoints - Maximum number of points to sample
   * @returns {Array<{lat: number, lon: number}>} - Sampled coordinates
   */
  _sampleRouteCoordinates(coordinates, maxPoints) {
    if (coordinates.length <= maxPoints) {
      return coordinates;
    }

    const sampledCoordinates = [];
    const step = Math.max(1, Math.floor(coordinates.length / maxPoints));

    // Always include start and end points
    sampledCoordinates.push(coordinates[0]);

    // Add intermediate points based on step size
    for (let i = step; i < coordinates.length - 1; i += step) {
      sampledCoordinates.push(coordinates[i]);
    }

    // Add end point if not already included
    if (sampledCoordinates[sampledCoordinates.length - 1] !== coordinates[coordinates.length - 1]) {
      sampledCoordinates.push(coordinates[coordinates.length - 1]);
    }

    return sampledCoordinates;
  }
};

export default openWeatherMapService;