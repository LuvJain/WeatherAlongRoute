import { AsyncStorage } from 'react-native';
import LocationStorage from '../services/LocationStorage';
import type { Location, RecentLocation } from '../models/Location';

// Mock AsyncStorage
jest.mock('react-native', () => ({
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('LocationStorage iOS Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveLocation', () => {
    it('should save a new location with frequency 1', async () => {
      const mockLocation: Location = {
        id: '1',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY',
        name: 'NYC',
        validated: true,
        placeId: 'place_123',
        timestamp: Date.now(),
      };

      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await LocationStorage.saveLocation(mockLocation);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ...mockLocation,
        frequency: 1,
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@WeatherAlongRoute:recentLocations',
        expect.any(String)
      );
    });

    it('should increment frequency for duplicate location', async () => {
      const mockLocation: Location = {
        id: '1',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY',
        name: 'NYC',
        validated: true,
        timestamp: Date.now(),
      };

      const existingLocation: RecentLocation = {
        ...mockLocation,
        frequency: 2,
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([existingLocation]));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await LocationStorage.saveLocation(mockLocation);

      expect(result).toHaveLength(1);
      expect(result[0].frequency).toBe(3);
    });

    it('should maintain max 20 recent locations', async () => {
      const existingLocations: RecentLocation[] = Array.from(
        { length: 20 },
        (_, i) => ({
          id: `${i}`,
          latitude: 40.7128 + i,
          longitude: -74.0060 + i,
          address: `Location ${i}`,
          validated: true,
          timestamp: Date.now(),
          frequency: 1,
        })
      );

      const newLocation: Location = {
        id: '21',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New Location',
        validated: true,
        timestamp: Date.now(),
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingLocations));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await LocationStorage.saveLocation(newLocation);

      expect(result).toHaveLength(20);
    });
  });

  describe('getRecentLocations', () => {
    it('should retrieve recent locations', async () => {
      const mockLocations: RecentLocation[] = [
        {
          id: '1',
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'New York, NY',
          validated: true,
          timestamp: Date.now(),
          frequency: 2,
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLocations));

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual(mockLocations);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        '@WeatherAlongRoute:recentLocations'
      );
    });

    it('should return empty array if no locations stored', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual([]);
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location by id', async () => {
      const mockLocations: RecentLocation[] = [
        {
          id: '1',
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'New York, NY',
          validated: true,
          timestamp: Date.now(),
          frequency: 1,
        },
        {
          id: '2',
          latitude: 34.0522,
          longitude: -118.2437,
          address: 'Los Angeles, CA',
          validated: true,
          timestamp: Date.now(),
          frequency: 1,
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLocations));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await LocationStorage.deleteLocation('1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('frequency increment scenarios', () => {
    it('should increment frequency when same location is saved multiple times', async () => {
      const mockLocation: Location = {
        id: '1',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY',
        validated: true,
        timestamp: Date.now(),
      };

      // First save
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const firstResult = await LocationStorage.saveLocation(mockLocation);
      expect(firstResult[0].frequency).toBe(1);

      // Second save (duplicate)
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(firstResult));

      const secondResult = await LocationStorage.saveLocation(mockLocation);
      expect(secondResult[0].frequency).toBe(2);

      // Third save (duplicate)
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(secondResult));

      const thirdResult = await LocationStorage.saveLocation(mockLocation);
      expect(thirdResult[0].frequency).toBe(3);
    });
  });

  describe('clearAllLocations', () => {
    it('should clear all locations', async () => {
      AsyncStorage.removeItem.mockResolvedValue(undefined);

      await LocationStorage.clearAllLocations();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        '@WeatherAlongRoute:recentLocations'
      );
    });
  });

  describe('getLocationById', () => {
    it('should get a location by id', async () => {
      const mockLocation: RecentLocation = {
        id: '1',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY',
        validated: true,
        timestamp: Date.now(),
        frequency: 1,
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([mockLocation]));

      const result = await LocationStorage.getLocationById('1');

      expect(result).toEqual(mockLocation);
    });

    it('should return undefined if location not found', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await LocationStorage.getLocationById('nonexistent');

      expect(result).toBeUndefined();
    });
  });
});
