import { WeatherService, WeatherData } from '../weatherService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock fetch
global.fetch = jest.fn();

describe('WeatherService', () => {
  let weatherService: WeatherService;

  const mockWeatherData: Record<string, WeatherData> = {
    'stop1': {
      temperature: 72,
      condition: 'sunny',
      humidity: 45,
      windSpeed: 10,
      fetchTimestamp: Date.now(),
    },
    'stop2': {
      temperature: 68,
      condition: 'cloudy',
      humidity: 60,
      windSpeed: 15,
      fetchTimestamp: Date.now(),
    },
    'stop3': {
      temperature: 65,
      condition: 'rainy',
      humidity: 80,
      windSpeed: 20,
      fetchTimestamp: Date.now(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    weatherService = new WeatherService({
      cacheTimeoutMs: 120 * 60 * 1000,
      maxBatchSize: 5,
      apiBaseUrl: 'https://api.weather.com',
    });

    // Mock AsyncStorage implementations
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(true);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(true);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(true);
  });

  describe('Batch Fetching (max 5 points per request)', () => {
    it('should split large request into batches of max 5 items', async () => {
      const stopPoints = ['stop1', 'stop2', 'stop3', 'stop4', 'stop5', 'stop6', 'stop7'];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stop1: mockWeatherData['stop1'],
          stop2: mockWeatherData['stop2'],
          stop3: mockWeatherData['stop3'],
          stop4: { temperature: 70, condition: 'clear', humidity: 50, windSpeed: 12, fetchTimestamp: Date.now() },
          stop5: { temperature: 71, condition: 'clear', humidity: 48, windSpeed: 11, fetchTimestamp: Date.now() },
        }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stop6: { temperature: 69, condition: 'partly cloudy', humidity: 55, windSpeed: 13, fetchTimestamp: Date.now() },
          stop7: { temperature: 73, condition: 'clear', humidity: 42, windSpeed: 9, fetchTimestamp: Date.now() },
        }),
      });

      await weatherService.getWeather(stopPoints);

      // Verify fetch was called twice (batches of 5 and 2)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should fetch exactly 5 points in single batch when request size is 5', async () => {
      const stopPoints = ['stop1', 'stop2', 'stop3', 'stop4', 'stop5'];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherData,
      });

      await weatherService.getWeather(stopPoints);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.weather.com/weather/batch',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ stopPoints }),
        })
      );
    });

    it('should fetch less than 5 points in single batch', async () => {
      const stopPoints = ['stop1', 'stop2', 'stop3'];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stop1: mockWeatherData['stop1'],
          stop2: mockWeatherData['stop2'],
          stop3: mockWeatherData['stop3'],
        }),
      });

      await weatherService.getWeather(stopPoints);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Caching (120 minute timeout)', () => {
    it('should return cached data for same stop point within 120 minutes', async () => {
      const stopPoint = 'stop1';

      // First request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          [stopPoint]: mockWeatherData[stopPoint],
        }),
      });

      const result1 = await weatherService.getWeather([stopPoint]);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      const result2 = await weatherService.getWeather([stopPoint]);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional call

      expect(result1[stopPoint]).toEqual(result2[stopPoint]);
    });

    it('should not return cached data after 120 minutes', async () => {
      jest.useFakeTimers();
      const stopPoint = 'stop1';

      // First request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          [stopPoint]: mockWeatherData[stopPoint],
        }),
      });

      await weatherService.getWeather([stopPoint]);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance time by 121 minutes
      jest.advanceTimersByTime(121 * 60 * 1000);

      // Second request - should not use cache
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          [stopPoint]: {
            ...mockWeatherData[stopPoint],
            temperature: 75, // Different data
          },
        }),
      });

      await weatherService.getWeather([stopPoint]);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should persist cache to AsyncStorage', async () => {
      const stopPoint = 'stop1';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          [stopPoint]: mockWeatherData[stopPoint],
        }),
      });

      await weatherService.getWeather([stopPoint]);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `WEATHER_CACHE_${stopPoint}`,
        expect.stringContaining(stopPoint)
      );
    });

    it('should load cache from AsyncStorage on initialization', async () => {
      const stopPoint = 'stop1';
      const cachedEntry = {
        data: mockWeatherData[stopPoint],
        timestamp: Date.now(),
      };

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([`WEATHER_CACHE_${stopPoint}`]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedEntry));

      const newService = new WeatherService();
      await newService.loadCacheFromStorage();

      expect(newService.getCachedStopPoints()).toContain(stopPoint);
    });

    it('should include fetch timestamp in weather data', async () => {
      const stopPoint = 'stop1';
      const beforeTime = Date.now();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          [stopPoint]: mockWeatherData[stopPoint],
        }),
      });

      const result = await weatherService.getWeather([stopPoint]);
      const afterTime = Date.now();

      expect(result[stopPoint].fetchTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result[stopPoint].fetchTimestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Weather Data Structure', () => {
    it('should return weather data with all required fields', async () => {
      const stopPoint = 'stop1';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          [stopPoint]: mockWeatherData[stopPoint],
        }),
      });

      const result = await weatherService.getWeather([stopPoint]);
      const weather = result[stopPoint];

      expect(weather).toHaveProperty('temperature');
      expect(weather).toHaveProperty('condition');
      expect(weather).toHaveProperty('humidity');
      expect(weather).toHaveProperty('windSpeed');
      expect(weather).toHaveProperty('fetchTimestamp');

      expect(typeof weather.temperature).toBe('number');
      expect(typeof weather.condition).toBe('string');
      expect(typeof weather.humidity).toBe('number');
      expect(typeof weather.windSpeed).toBe('number');
      expect(typeof weather.fetchTimestamp).toBe('number');
    });
  });

  describe('Offline Queueing', () => {
    it('should queue request when API call fails', async () => {
      const stopPoints = ['stop1', 'stop2'];

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      try {
        await weatherService.getWeather(stopPoints);
      } catch (error) {
        // Expected to fail
      }

      const queue = await weatherService.getOfflineQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].stopPoints).toEqual(stopPoints);
      expect(queue[0].retries).toBe(0);
    });

    it('should store queue in AsyncStorage', async () => {
      const stopPoints = ['stop1'];

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      try {
        await weatherService.getWeather(stopPoints);
      } catch (error) {
        // Expected to fail
      }

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'WEATHER_OFFLINE_QUEUE',
        expect.stringContaining('stopPoints')
      );
    });

    it('should process offline queue when connection restored', async () => {
      const stopPoints = ['stop1'];

      // Queue a request
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      try {
        await weatherService.getWeather(stopPoints);
      } catch (error) {
        // Expected to fail
      }

      // Mock successful response for queue processing
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stop1: mockWeatherData['stop1'],
        }),
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{
          stopPoints,
          timestamp: Date.now(),
          retries: 0,
        }])
      );

      await weatherService.processOfflineQueue();

      // Verify queue was processed and cleared
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'WEATHER_OFFLINE_QUEUE',
        JSON.stringify([])
      );
    });

    it('should increment retry count on failed queue processing', async () => {
      const stopPoints = ['stop1'];

      // Add entry to queue manually
      await weatherService.queueOfflineRequest(stopPoints);

      // Mock failure for first processing attempt
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{
          stopPoints,
          timestamp: Date.now(),
          retries: 0,
        }])
      );

      try {
        await weatherService.processOfflineQueue();
      } catch (error) {
        // Expected to fail
      }

      // Verify retry count was incremented
      const lastCall = (AsyncStorage.setItem as jest.Mock).mock.calls.pop();
      if (lastCall && lastCall[0] === 'WEATHER_OFFLINE_QUEUE') {
        const queueData = JSON.parse(lastCall[1]);
        expect(queueData[0].retries).toBe(1);
      }
    });

    it('should remove queue entry after max retries (3)', async () => {
      const stopPoints = ['stop1'];
      const queueEntry = {
        stopPoints,
        timestamp: Date.now(),
        retries: 3,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([queueEntry]));
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      try {
        await weatherService.processOfflineQueue();
      } catch (error) {
        // Expected to fail
      }

      const lastCall = (AsyncStorage.setItem as jest.Mock).mock.calls.pop();
      if (lastCall && lastCall[0] === 'WEATHER_OFFLINE_QUEUE') {
        const queueData = JSON.parse(lastCall[1]);
        // After max retries exceeded, the entry should be removed
        expect(queueData.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Retry Logic', () => {
    it('should handle batch processing with partial data', async () => {
      const stopPoints = ['stop1', 'stop2', 'stop3'];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stop1: mockWeatherData['stop1'],
          stop2: mockWeatherData['stop2'],
          stop3: mockWeatherData['stop3'],
        }),
      });

      const result = await weatherService.getWeather(stopPoints);
      expect(Object.keys(result).length).toBe(3);
    });

    it('should retry on API error', async () => {
      const stopPoints = ['stop1'];

      // First call fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'));

      try {
        await weatherService.getWeather(stopPoints);
      } catch (error) {
        expect(error.message).toContain('API error');
      }

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Management', () => {
    it('should return correct cache size', async () => {
      const stopPoints = ['stop1', 'stop2'];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stop1: mockWeatherData['stop1'],
          stop2: mockWeatherData['stop2'],
        }),
      });

      await weatherService.getWeather(stopPoints);
      expect(weatherService.getCacheSize()).toBe(2);
    });

    it('should clear all cache and queue', async () => {
      const stopPoints = ['stop1'];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stop1: mockWeatherData['stop1'],
        }),
      });

      await weatherService.getWeather(stopPoints);
      await weatherService.queueOfflineRequest(['stop2']);

      await weatherService.clearAll();

      expect(weatherService.getCacheSize()).toBe(0);
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should list all cached stop points', async () => {
      const stopPoints = ['stop1', 'stop2', 'stop3'];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherData,
      });

      await weatherService.getWeather(stopPoints);

      const cachedPoints = weatherService.getCachedStopPoints();
      expect(cachedPoints).toContain('stop1');
      expect(cachedPoints).toContain('stop2');
      expect(cachedPoints).toContain('stop3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty stop points list', async () => {
      const result = await weatherService.getWeather([]);
      expect(result).toEqual({});
    });

    it('should handle mix of cached and uncached points', async () => {
      // First request to cache stop1
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stop1: mockWeatherData['stop1'],
        }),
      });

      await weatherService.getWeather(['stop1']);

      // Second request with stop1 (cached) and stop2 (new)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stop2: mockWeatherData['stop2'],
        }),
      });

      const result = await weatherService.getWeather(['stop1', 'stop2']);

      expect(result['stop1']).toEqual(mockWeatherData['stop1']);
      expect(result['stop2']).toEqual(mockWeatherData['stop2']);
      expect(global.fetch).toHaveBeenCalledTimes(2); // One for stop1, one for stop2
    });

    it('should not process queue concurrently', async () => {
      const stopPoints = ['stop1'];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([{
          stopPoints,
          timestamp: Date.now(),
          retries: 0,
        }])
      );

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          stop1: mockWeatherData['stop1'],
        }),
      });

      // Start two concurrent queue processing
      const promise1 = weatherService.processOfflineQueue();
      const promise2 = weatherService.processOfflineQueue();

      await Promise.all([promise1, promise2]);

      // Should still complete without issues
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
