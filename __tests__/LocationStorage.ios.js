// @flow

import AsyncStorage from '@react-native-community/async-storage';
import LocationStorage from '../services/LocationStorage';
import { createLocation } from '../models/Location';

// Mock AsyncStorage
jest.mock('@react-native-community/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(null),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
}));

describe('LocationStorage - iOS', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    AsyncStorage.setItem.mockResolvedValue(null);
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.removeItem.mockResolvedValue(null);
  });

  describe('saveLocation', () => {
    it('should save a new location to AsyncStorage', async () => {
      const location = createLocation(
        'San Francisco, CA',
        37.7749,
        -122.4194,
        'place123',
        true
      );

      AsyncStorage.getItem.mockResolvedValueOnce(null);

      await LocationStorage.saveLocation(location);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'RECENT_LOCATIONS',
        expect.stringContaining('San Francisco')
      );
    });

    it('should increment frequency when saving duplicate location', async () => {
      const location = createLocation(
        'San Francisco, CA',
        37.7749,
        -122.4194,
        'place123',
        true
      );

      const existingData = [
        {
          id: '37.7749,-122.4194',
          location,
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingData));

      await LocationStorage.saveLocation(location);

      const callArgs = AsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData[0].frequency).toBe(2);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'RECENT_LOCATIONS',
        expect.any(String)
      );
    });

    it('should maintain max 20 recent items', async () => {
      const locations = Array.from({ length: 25 }, (_, i) =>
        createLocation(
          `Location ${i}`,
          37.7749 + i * 0.001,
          -122.4194 + i * 0.001,
          `place${i}`,
          true
        )
      );

      const existingData = locations.slice(0, 20).map((loc, idx) => ({
        id: loc.id,
        location: loc,
        frequency: 1,
        lastUsed: Date.now(),
      }));

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingData));

      await LocationStorage.saveLocation(locations[20]);

      const callArgs = AsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData.length).toBeLessThanOrEqual(20);
    });

    it('should move duplicate to front with updated timestamp', async () => {
      const location1 = createLocation('Location 1', 37.7749, -122.4194, 'p1', true);
      const location2 = createLocation('Location 2', 37.7749, -121.4194, 'p2', true);
      const location3 = createLocation('Location 3', 37.7749, -120.4194, 'p3', true);

      const existingData = [
        {
          id: location3.id,
          location: location3,
          frequency: 1,
          lastUsed: Date.now() - 1000,
        },
        {
          id: location2.id,
          location: location2,
          frequency: 1,
          lastUsed: Date.now(),
        },
        {
          id: location1.id,
          location: location1,
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingData));

      await LocationStorage.saveLocation(location1);

      const callArgs = AsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      // location1 should be at the front
      expect(savedData[0].id).toBe(location1.id);
      expect(savedData[0].frequency).toBe(2);
    });
  });

  describe('getRecentLocations', () => {
    it('should retrieve recent locations from AsyncStorage', async () => {
      const mockData = [
        {
          id: '37.7749,-122.4194',
          location: createLocation('San Francisco, CA', 37.7749, -122.4194),
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockData));

      const result = await LocationStorage.getRecentLocations();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('RECENT_LOCATIONS');
      expect(result).toEqual(mockData);
    });

    it('should return empty array when no locations exist', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual([]);
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location by ID', async () => {
      const location1 = createLocation('Location 1', 37.7749, -122.4194);
      const location2 = createLocation('Location 2', 37.7749, -121.4194);

      const existingData = [
        {
          id: location1.id,
          location: location1,
          frequency: 1,
          lastUsed: Date.now(),
        },
        {
          id: location2.id,
          location: location2,
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingData));

      await LocationStorage.deleteLocation(location1.id);

      const callArgs = AsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe(location2.id);
    });

    it('should handle deletion of non-existent location gracefully', async () => {
      const location = createLocation('Location 1', 37.7749, -122.4194);

      const existingData = [
        {
          id: location.id,
          location,
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingData));

      await LocationStorage.deleteLocation('non-existent-id');

      const callArgs = AsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData).toHaveLength(1);
    });
  });

  describe('clearAllLocations', () => {
    it('should clear all locations', async () => {
      await LocationStorage.clearAllLocations();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('RECENT_LOCATIONS');
    });
  });

  describe('getLocationsByFrequency', () => {
    it('should return locations sorted by frequency', async () => {
      const location1 = createLocation('Location 1', 37.7749, -122.4194);
      const location2 = createLocation('Location 2', 37.7749, -121.4194);
      const location3 = createLocation('Location 3', 37.7749, -120.4194);

      const existingData = [
        {
          id: location1.id,
          location: location1,
          frequency: 5,
          lastUsed: Date.now(),
        },
        {
          id: location2.id,
          location: location2,
          frequency: 3,
          lastUsed: Date.now(),
        },
        {
          id: location3.id,
          location: location3,
          frequency: 10,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingData));

      const result = await LocationStorage.getLocationsByFrequency();

      expect(result[0].frequency).toBe(10); // location3
      expect(result[1].frequency).toBe(5); // location1
      expect(result[2].frequency).toBe(3); // location2
    });
  });

  describe('getLocationCount', () => {
    it('should return the count of stored locations', async () => {
      const mockData = [
        {
          id: '1',
          location: createLocation('Location 1', 37.7749, -122.4194),
          frequency: 1,
          lastUsed: Date.now(),
        },
        {
          id: '2',
          location: createLocation('Location 2', 37.7749, -121.4194),
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockData));

      const result = await LocationStorage.getLocationCount();

      expect(result).toBe(2);
    });

    it('should return 0 when no locations exist', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await LocationStorage.getLocationCount();

      expect(result).toBe(0);
    });
  });

  describe('getRecentLocationById', () => {
    it('should retrieve a location by ID', async () => {
      const location = createLocation('San Francisco, CA', 37.7749, -122.4194);
      const mockData = [
        {
          id: location.id,
          location,
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockData));

      const result = await LocationStorage.getRecentLocationById(location.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(location.id);
    });

    it('should return null for non-existent location', async () => {
      const mockData = [];

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockData));

      const result = await LocationStorage.getRecentLocationById('non-existent');

      expect(result).toBeNull();
    });
  });
});
