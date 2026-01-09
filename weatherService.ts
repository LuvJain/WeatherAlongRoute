import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Weather data structure
 */
export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  fetchTimestamp: number;
}

/**
 * Stop point weather cache entry
 */
interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

/**
 * Offline request queue entry
 */
interface QueueEntry {
  stopPoints: string[];
  timestamp: number;
  retries: number;
}

/**
 * Weather Service Configuration
 */
interface ServiceConfig {
  cacheTimeoutMs: number;
  maxBatchSize: number;
  apiBaseUrl: string;
}

const CACHE_KEY_PREFIX = 'WEATHER_CACHE_';
const QUEUE_STORAGE_KEY = 'WEATHER_OFFLINE_QUEUE';
const DEFAULT_CONFIG: ServiceConfig = {
  cacheTimeoutMs: 120 * 60 * 1000, // 120 minutes
  maxBatchSize: 5,
  apiBaseUrl: 'https://api.weather.com',
};

/**
 * WeatherService handles batch fetching, caching, and offline queueing
 */
export class WeatherService {
  private cache: Map<string, CacheEntry> = new Map();
  private config: ServiceConfig;
  private processingQueue: boolean = false;

  constructor(config: Partial<ServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get cache key for a stop point
   */
  private getCacheKey(stopPoint: string): string {
    return `${CACHE_KEY_PREFIX}${stopPoint}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return now - entry.timestamp < this.config.cacheTimeoutMs;
  }

  /**
   * Load cache from AsyncStorage
   */
  async loadCacheFromStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          const stopPoint = key.replace(CACHE_KEY_PREFIX, '');
          this.cache.set(stopPoint, entry);
        }
      }
    } catch (error) {
      console.error('Error loading cache from storage:', error);
    }
  }

  /**
   * Save cache entry to AsyncStorage
   */
  private async saveCacheToStorage(
    stopPoint: string,
    entry: CacheEntry
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getCacheKey(stopPoint), JSON.stringify(entry));
    } catch (error) {
      console.error('Error saving cache to storage:', error);
    }
  }

  /**
   * Get cached weather data for a stop point
   */
  private getCachedWeather(stopPoint: string): WeatherData | null {
    const entry = this.cache.get(stopPoint);
    if (entry && this.isCacheValid(entry)) {
      return entry.data;
    }
    return null;
  }

  /**
   * Fetch weather data from API (mock implementation)
   */
  private async fetchFromAPI(stopPoints: string[]): Promise<Record<string, WeatherData>> {
    try {
      // Mock API call - in production this would be a real HTTP request
      const response = await fetch(`${this.config.apiBaseUrl}/weather/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopPoints }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching from API:', error);
      throw error;
    }
  }

  /**
   * Split stop points into batches (max 5 per batch)
   */
  private batchStopPoints(stopPoints: string[]): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < stopPoints.length; i += this.config.maxBatchSize) {
      batches.push(stopPoints.slice(i, i + this.config.maxBatchSize));
    }
    return batches;
  }

  /**
   * Get weather data for multiple stop points with caching
   */
  async getWeather(stopPoints: string[]): Promise<Record<string, WeatherData>> {
    const result: Record<string, WeatherData> = {};
    const uncachedPoints: string[] = [];

    // Check cache for each stop point
    for (const point of stopPoints) {
      const cached = this.getCachedWeather(point);
      if (cached) {
        result[point] = cached;
      } else {
        uncachedPoints.push(point);
      }
    }

    // If all data is cached, return immediately
    if (uncachedPoints.length === 0) {
      return result;
    }

    // Fetch uncached data in batches
    try {
      const batches = this.batchStopPoints(uncachedPoints);
      for (const batch of batches) {
        const batchResult = await this.fetchFromAPI(batch);

        // Cache and return results
        for (const [point, data] of Object.entries(batchResult)) {
          const cacheEntry: CacheEntry = {
            data,
            timestamp: Date.now(),
          };
          this.cache.set(point, cacheEntry);
          await this.saveCacheToStorage(point, cacheEntry);
          result[point] = data;
        }
      }
    } catch (error) {
      // Queue for offline processing
      await this.queueOfflineRequest(uncachedPoints);
      throw error;
    }

    return result;
  }

  /**
   * Queue a request for offline processing
   */
  async queueOfflineRequest(stopPoints: string[]): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      queue.push({
        stopPoints,
        timestamp: Date.now(),
        retries: 0,
      });
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error queuing offline request:', error);
    }
  }

  /**
   * Get offline request queue from AsyncStorage
   */
  async getOfflineQueue(): Promise<QueueEntry[]> {
    try {
      const queue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  /**
   * Process offline queue when connection is restored
   */
  async processOfflineQueue(): Promise<void> {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;
    try {
      let queue = await this.getOfflineQueue();

      while (queue.length > 0) {
        const entry = queue[0];

        try {
          // Process the request
          const result = await this.getWeather(entry.stopPoints);

          // Remove from queue on success
          queue.shift();
          await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
        } catch (error) {
          // Increment retry count
          entry.retries++;

          // Max 3 retries before giving up
          if (entry.retries >= 3) {
            queue.shift();
          }

          await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
          throw error; // Stop processing on failure
        }
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Clear all cache and queue
   */
  async clearAll(): Promise<void> {
    try {
      this.cache.clear();
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove([...cacheKeys, QUEUE_STORAGE_KEY]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  /**
   * Get cache size (for debugging)
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get all cached stop points
   */
  getCachedStopPoints(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Export singleton instance
export const weatherService = new WeatherService();
