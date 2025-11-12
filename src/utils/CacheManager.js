/**
 * CacheManager.js
 * A utility class for caching data in AsyncStorage with TTL support
 */

import AsyncStorage from '@react-native-community/async-storage';

class CacheManager {
  /**
   * Constructor
   * @param {string} namespace - Namespace for the cache to avoid key collisions
   */
  constructor(namespace = 'app_cache') {
    this.namespace = namespace;
  }

  /**
   * Generate a cache key with namespace
   * @param {string} key - The original key
   * @returns {string} - Namespaced key
   */
  _getCacheKey(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * Set an item in the cache with TTL
   * @param {string} key - The key to store data under
   * @param {*} data - The data to store
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<void>}
   */
  async setItem(key, data, ttl) {
    const cacheKey = this._getCacheKey(key);

    const cacheItem = {
      data,
      expires: ttl ? Date.now() + ttl : null
    };

    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  /**
   * Get an item from the cache if it exists and has not expired
   * @param {string} key - The key to retrieve
   * @returns {Promise<*|null>} - The cached data or null if not found/expired
   */
  async getItem(key) {
    const cacheKey = this._getCacheKey(key);

    try {
      const cachedItem = await AsyncStorage.getItem(cacheKey);

      if (!cachedItem) {
        return null;
      }

      const { data, expires } = JSON.parse(cachedItem);

      // Check if the item has expired
      if (expires && Date.now() > expires) {
        // Remove expired item
        await this.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error retrieving cached data:', error);
      return null;
    }
  }

  /**
   * Remove an item from the cache
   * @param {string} key - The key to remove
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    const cacheKey = this._getCacheKey(key);

    try {
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error removing cached data:', error);
    }
  }

  /**
   * Clear all items in this cache namespace
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const namespaceKeys = allKeys.filter(key => key.startsWith(`${this.namespace}:`));

      if (namespaceKeys.length > 0) {
        await AsyncStorage.multiRemove(namespaceKeys);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear expired items in this cache namespace
   * @returns {Promise<void>}
   */
  async clearExpired() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const namespaceKeys = allKeys.filter(key => key.startsWith(`${this.namespace}:`));

      const expiredKeys = [];

      for (const cacheKey of namespaceKeys) {
        const cachedItem = await AsyncStorage.getItem(cacheKey);

        if (cachedItem) {
          const { expires } = JSON.parse(cachedItem);

          if (expires && Date.now() > expires) {
            expiredKeys.push(cacheKey);
          }
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
      }
    } catch (error) {
      console.error('Error clearing expired cache items:', error);
    }
  }
}

export default CacheManager;