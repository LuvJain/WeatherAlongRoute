/**
 * Cache utility for storing API responses and other data
 * Implements an in-memory cache with TTL (time-to-live) and AsyncStorage for persistence
 */

import AsyncStorage from 'react-native-async-storage/async-storage';
import { weatherLogger as logger } from './logger';
import apiConfig from '../config/api';

// In-memory cache
const memoryCache = new Map();

// Cache keys
const CACHE_KEYS = {
  WEATHER_DATA: 'weather_data_',
};

// Cache utility
const cache = {
  /**
   * Get item from cache
   * @param {string} key - The cache key
   * @returns {Promise<any>} - The cached value or null if not found/expired
   */
  async get(key) {
    try {
      // Check memory cache first
      const memItem = memoryCache.get(key);
      if (memItem) {
        // Check if the item has expired
        if (memItem.expiry && memItem.expiry > Date.now()) {
          logger.debug(`Cache hit (memory): ${key}`);
          return memItem.value;
        }
        // Remove expired item
        memoryCache.delete(key);
      }

      // Check AsyncStorage
      const storedItem = await AsyncStorage.getItem(key);
      if (storedItem) {
        const parsedItem = JSON.parse(storedItem);

        // Check if the item has expired
        if (parsedItem.expiry && parsedItem.expiry > Date.now()) {
          // Store in memory cache for faster access next time
          memoryCache.set(key, parsedItem);
          logger.debug(`Cache hit (storage): ${key}`);
          return parsedItem.value;
        }
        // Remove expired item
        await AsyncStorage.removeItem(key);
      }

      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error('Error getting item from cache', error);
      return null;
    }
  },

  /**
   * Set item in cache
   * @param {string} key - The cache key
   * @param {any} value - The value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = null) {
    try {
      const expiry = ttl ? Date.now() + ttl : null;
      const item = { value, expiry };

      // Store in memory cache
      memoryCache.set(key, item);

      // Store in AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(item));

      logger.debug(`Cache set: ${key}, TTL: ${ttl ? ttl / 1000 : 'indefinite'} seconds`);
      return true;
    } catch (error) {
      logger.error('Error setting item in cache', error);
      return false;
    }
  },

  /**
   * Remove item from cache
   * @param {string} key - The cache key
   * @returns {Promise<boolean>} - Success status
   */
  async remove(key) {
    try {
      memoryCache.delete(key);
      await AsyncStorage.removeItem(key);
      logger.debug(`Cache removed: ${key}`);
      return true;
    } catch (error) {
      logger.error('Error removing item from cache', error);
      return false;
    }
  },

  /**
   * Generate weather cache key
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {string} - Cache key
   */
  getWeatherCacheKey(lat, lon) {
    // Round coordinates to 4 decimal places for consistent caching
    const roundedLat = parseFloat(lat).toFixed(4);
    const roundedLon = parseFloat(lon).toFixed(4);
    return `${CACHE_KEYS.WEATHER_DATA}${roundedLat}_${roundedLon}`;
  }
};

export default cache;