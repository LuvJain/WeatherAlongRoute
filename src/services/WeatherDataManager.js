/**
 * WeatherDataManager.js
 * Service for fetching and caching weather data
 */

import OpenWeatherMapService from './OpenWeatherMapService';
import CacheManager from '../utils/CacheManager';
import { OPEN_WEATHER_MAP_CONFIG } from '../config/api';

class WeatherDataManager {
  constructor() {
    this.weatherService = OpenWeatherMapService;
    this.cacheManager = new CacheManager('weather_cache');
    this.cacheTTL = {
      currentWeather: OPEN_WEATHER_MAP_CONFIG.CACHE.CURRENT_WEATHER_TTL,
      forecast: OPEN_WEATHER_MAP_CONFIG.CACHE.FORECAST_TTL,
    };
  }

  /**
   * Generate a cache key for a weather request
   * @param {string} type - Type of weather data (current or forecast)
   * @param {Object} params - Request parameters
   * @returns {string} - Cache key
   */
  _generateCacheKey(type, params) {
    // Create a consistent key format regardless of parameter order
    const sortedParams = Object.entries(params)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return `${type}_${sortedParams}`;
  }

  /**
   * Get current weather with caching
   * @param {Object} params - Location parameters (same as OpenWeatherMapService.getCurrentWeather)
   * @param {boolean} forceRefresh - Whether to bypass cache and force a new API request
   * @returns {Promise<Object>} - Current weather data
   */
  async getCurrentWeather(params, forceRefresh = false) {
    const cacheKey = this._generateCacheKey('current', params);

    if (!forceRefresh) {
      // Try to get from cache first
      const cachedData = await this.cacheManager.getItem(cacheKey);
      if (cachedData) {
        console.log('Returning cached current weather data');
        return cachedData;
      }
    }

    // If not in cache or forced refresh, fetch from API
    try {
      const weatherData = await this.weatherService.getCurrentWeather(params);

      // Cache the result
      await this.cacheManager.setItem(
        cacheKey,
        weatherData,
        this.cacheTTL.currentWeather
      );

      return weatherData;
    } catch (error) {
      // If API fails, try to use cached data even if it's expired
      // This provides fallback during network issues
      const expiredData = await this.cacheManager.getItem(cacheKey, true);
      if (expiredData) {
        console.warn('Using expired weather data due to API error');
        return {
          ...expiredData,
          isExpiredCache: true
        };
      }

      // No cached data available, rethrow the error
      throw error;
    }
  }

  /**
   * Get weather forecast with caching
   * @param {Object} params - Location parameters (same as OpenWeatherMapService.getForecast)
   * @param {boolean} forceRefresh - Whether to bypass cache and force a new API request
   * @returns {Promise<Object>} - Forecast data
   */
  async getForecast(params, forceRefresh = false) {
    const cacheKey = this._generateCacheKey('forecast', params);

    if (!forceRefresh) {
      // Try to get from cache first
      const cachedData = await this.cacheManager.getItem(cacheKey);
      if (cachedData) {
        console.log('Returning cached forecast data');
        return cachedData;
      }
    }

    // If not in cache or forced refresh, fetch from API
    try {
      const forecastData = await this.weatherService.getForecast(params);

      // Cache the result
      await this.cacheManager.setItem(
        cacheKey,
        forecastData,
        this.cacheTTL.forecast
      );

      return forecastData;
    } catch (error) {
      // If API fails, try to use cached data even if it's expired
      // This provides fallback during network issues
      const expiredData = await this.cacheManager.getItem(cacheKey, true);
      if (expiredData) {
        console.warn('Using expired forecast data due to API error');
        return {
          ...expiredData,
          isExpiredCache: true
        };
      }

      // No cached data available, rethrow the error
      throw error;
    }
  }

  /**
   * Get both current weather and forecast for a location
   * @param {Object} params - Location parameters
   * @param {boolean} forceRefresh - Whether to bypass cache
   * @returns {Promise<{current: Object, forecast: Object}>} - Weather and forecast data
   */
  async getWeatherAndForecast(params, forceRefresh = false) {
    try {
      // Fetch both in parallel
      const [current, forecast] = await Promise.all([
        this.getCurrentWeather(params, forceRefresh),
        this.getForecast(params, forceRefresh)
      ]);

      return { current, forecast };
    } catch (error) {
      console.error('Error fetching weather and forecast:', error);
      throw error;
    }
  }

  /**
   * Clear all cached weather data
   * @returns {Promise<void>}
   */
  async clearCache() {
    await this.cacheManager.clearAll();
  }

  /**
   * Clear only expired cache entries
   * @returns {Promise<void>}
   */
  async clearExpiredCache() {
    await this.cacheManager.clearExpired();
  }
}

// Export as singleton
export default new WeatherDataManager();