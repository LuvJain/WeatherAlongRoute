// @flow

/**
 * iOS-specific LocationStorage tests
 * Contains identical test logic as the main test file
 */

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

describe('LocationStorage Service (iOS)', () => {
  let mockAsyncStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage = AsyncStorage;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('saveLocation', () => {
    it('should save a new location', async () => {
      const location: Location = {
        id: '1',
        name: 'Home',
        address: '123 Main St, City',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now(),
        validated: true,
      };

      await LocationStorage.saveLocation(location);

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = mockAsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData).toHaveLength(1);
      expect(savedData[0]).toEqual({
        ...location,
        frequency: 1,
      });
    });

    it('should increment frequency for duplicate locations', async () => {
      const location: Location = {
        id: '1',
        name: 'Home',
        address: '123 Main St, City',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now(),
        validated: true,
      };

      const existingLocation: RecentLocation = {
        ...location,
        frequency: 2,
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify([existingLocation])
      );

      await LocationStorage.saveLocation(location);

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = mockAsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData).toHaveLength(1);
      expect(savedData[0].frequency).toBe(3);
    });

    it('should move duplicate location to the front', async () => {
      const location1: Location = {
        id: '1',
        name: 'Home',
        address: '123 Main St, City',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: Date.now(),
        validated: true,
      };

      const location2: Location = {
        id: '2',
        name: 'Work',
        address: '456 Work Ave, City',
        latitude: 40.7580,
        longitude: -73.9855,
        timestamp: Date.now(),
        validated: true,
      };

      const existingLocations: RecentLocation[] = [
        { ...location1, frequency: 1 },
        { ...location2, frequency: 1 },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(existingLocations)
      );

      await LocationStorage.saveLocation(location1);

      const callArgs = mockAsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData[0].id).toBe('1');
      expect(savedData[0].frequency).toBe(2);
      expect(savedData[1].id).toBe('2');
    });

    it('should maintain max 20 recent items', async () => {
      const locations: RecentLocation[] = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        name: `Location ${i}`,
        address: `Address ${i}`,
        latitude: 40 + i * 0.1,
        longitude: -74 + i * 0.1,
        timestamp: Date.now(),
        validated: true,
        frequency: 1,
      }));

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(locations)
      );

      const newLocation: Location = {
        id: '20',
        name: 'New Location',
        address: 'New Address',
        latitude: 40.5,
        longitude: -73.5,
        timestamp: Date.now(),
        validated: true,
      };

      await LocationStorage.saveLocation(newLocation);

      const callArgs = mockAsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData).toHaveLength(20);
      expect(savedData[0].id).toBe('20');
    });
  });

  describe('getRecentLocations', () => {
    it('should retrieve recent locations', async () => {
      const locations: RecentLocation[] = [
        {
          id: '1',
          name: 'Home',
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: Date.now(),
          validated: true,
          frequency: 2,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(locations)
      );

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual(locations);
    });

    it('should return empty array when no locations exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual([]);
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location by id', async () => {
      const locations: RecentLocation[] = [
        {
          id: '1',
          name: 'Home',
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: Date.now(),
          validated: true,
          frequency: 1,
        },
        {
          id: '2',
          name: 'Work',
          address: '456 Work Ave',
          latitude: 40.7580,
          longitude: -73.9855,
          timestamp: Date.now(),
          validated: true,
          frequency: 1,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(locations)
      );

      await LocationStorage.deleteLocation('1');

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = mockAsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe('2');
    });
  });

  describe('clearAllLocations', () => {
    it('should clear all locations', async () => {
      await LocationStorage.clearAllLocations();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@WeatherAlongRoute:recentLocations'
      );
    });
  });

  describe('getLocationById', () => {
    it('should retrieve a location by id', async () => {
      const locations: RecentLocation[] = [
        {
          id: '1',
          name: 'Home',
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: Date.now(),
          validated: true,
          frequency: 1,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(locations)
      );

      const result = await LocationStorage.getLocationById('1');

      expect(result).toEqual(locations[0]);
    });

    it('should return null for non-existent id', async () => {
      const locations: RecentLocation[] = [
        {
          id: '1',
          name: 'Home',
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: Date.now(),
          validated: true,
          frequency: 1,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(locations)
      );

      const result = await LocationStorage.getLocationById('999');

      expect(result).toBeNull();
    });
  });
});
