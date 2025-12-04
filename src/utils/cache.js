/**
 * Cache utility for storing recent route weather calculations
 */

// Cache configuration
const DEFAULT_CACHE_SIZE = 20; // Max number of routes to cache
const DEFAULT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL in milliseconds

/**
 * Route Weather Cache Class
 * Implements an LRU (Least Recently Used) cache with TTL for weather data
 */
class RouteWeatherCache {
  constructor(maxSize = DEFAULT_CACHE_SIZE, ttl = DEFAULT_CACHE_TTL) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Generates a unique key for the route
   * @param {Object} startLocation - The starting location object
   * @param {Object} endLocation - The destination location object
   * @returns {String} - A cache key
   */
  static generateKey(startLocation, endLocation) {
    return `${startLocation.lat},${startLocation.lng}|${endLocation.lat},${endLocation.lng}`;
  }

  /**
   * Stores route weather data in the cache
   * @param {String} key - The cache key
   * @param {Object} data - The route weather data to cache
   */
  set(key, data) {
    // Check if we need to evict an entry (cache full)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Find the oldest entry to remove
      let oldestKey = null;
      let oldestTime = Date.now();

      for (const [entryKey, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestKey = entryKey;
          oldestTime = entry.timestamp;
        }
      }

      // Remove the oldest entry
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    // Add the new entry
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Retrieves route weather data from the cache
   * @param {String} key - The cache key
   * @returns {Object|null} - The cached data or null if not found or expired
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if the entry is expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    // Update timestamp to mark as recently used
    entry.timestamp = now;
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Clears all entries from the cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Returns the current size of the cache
   * @returns {Number} - The cache size
   */
  size() {
    return this.cache.size;
  }
}

// Create a singleton instance
const routeWeatherCache = new RouteWeatherCache();

export default routeWeatherCache;