import 'react-native';
import { AsyncStorage } from 'react-native';
import LocationStorage from '../src/services/LocationStorage';
import type { Location } from '../src/models/types';

jest.mock('react-native', () => ({
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

describe('LocationStorage (Android)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveLocation', () => {
    it('should save a new location with frequency 1', async () => {
      const mockLocation: Location = {
        id: 'loc_1',
        latitude: 40.7128,
        longitude: -74.0060,
        name: 'New York',
        address: '123 Main St',
        validated: true
      };

      // Mock empty storage
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await LocationStorage.saveLocation(mockLocation);

      expect(result.frequency).toBe(1);
      expect(result.id).toBe('loc_1');
      expect(result.name).toBe('New York');
      expect(result.validated).toBe(true);
      expect(result.lastUsed).toBeDefined();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should increment frequency for duplicate location (same coordinates)', async () => {
      const mockLocation: Location = {
        id: 'loc_1',
        latitude: 40.7128,
        longitude: -74.0060,
        name: 'New York',
        address: '123 Main St',
        validated: true
      };

      const existingLocations = [
        {
          id: 'loc_1',
          latitude: 40.7128,
          longitude: -74.0060,
          name: 'New York',
          address: '123 Main St',
          validated: true,
          frequency: 2,
          lastUsed: Date.now() - 1000
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingLocations));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await LocationStorage.saveLocation(mockLocation);

      expect(result.frequency).toBe(3);
      expect(result.id).toBe('loc_1');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should not exceed max 20 recent items', async () => {
      // Create 20 existing locations
      const existingLocations = Array.from({ length: 20 }, (_, i) => ({
        id: `loc_${i}`,
        latitude: 40.7128 + i * 0.001,
        longitude: -74.0060 + i * 0.001,
        name: `Location ${i}`,
        address: `Address ${i}`,
        validated: true,
        frequency: 1,
        lastUsed: Date.now()
      }));

      const newLocation: Location = {
        id: 'loc_21',
        latitude: 41.0,
        longitude: -75.0,
        name: 'New Location',
        address: 'New Address',
        validated: true
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingLocations));

      let savedData;
      AsyncStorage.setItem.mockImplementation((key, value) => {
        savedData = JSON.parse(value);
        return Promise.resolve();
      });

      await LocationStorage.saveLocation(newLocation);

      expect(savedData.length).toBe(20);
      expect(savedData[19].id).toBe('loc_21'); // New item should be last
      expect(savedData[0].id).toBe('loc_1'); // First old item should be removed
    });
  });

  describe('getRecentLocations', () => {
    it('should retrieve recent locations from AsyncStorage', async () => {
      const mockLocations = [
        {
          id: 'loc_1',
          latitude: 40.7128,
          longitude: -74.0060,
          name: 'New York',
          address: '123 Main St',
          validated: true,
          frequency: 2,
          lastUsed: Date.now()
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLocations));

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual(mockLocations);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('recent_locations');
    });

    it('should return empty array if no locations stored', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual([]);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual([]);
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location by id', async () => {
      const mockLocations = [
        {
          id: 'loc_1',
          latitude: 40.7128,
          longitude: -74.0060,
          name: 'New York',
          address: '123 Main St',
          validated: true,
          frequency: 1,
          lastUsed: Date.now()
        },
        {
          id: 'loc_2',
          latitude: 34.0522,
          longitude: -118.2437,
          name: 'Los Angeles',
          address: '456 Oak Ave',
          validated: true,
          frequency: 1,
          lastUsed: Date.now()
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLocations));
      AsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await LocationStorage.deleteLocation('loc_1');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should return false if location not found', async () => {
      const mockLocations = [
        {
          id: 'loc_1',
          latitude: 40.7128,
          longitude: -74.0060,
          name: 'New York',
          address: '123 Main St',
          validated: true,
          frequency: 1,
          lastUsed: Date.now()
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLocations));

      const result = await LocationStorage.deleteLocation('non_existent');

      expect(result).toBe(false);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('getLocationFrequency', () => {
    it('should return frequency for existing location', async () => {
      const mockLocations = [
        {
          id: 'loc_1',
          latitude: 40.7128,
          longitude: -74.0060,
          name: 'New York',
          address: '123 Main St',
          validated: true,
          frequency: 5,
          lastUsed: Date.now()
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLocations));

      const result = await LocationStorage.getLocationFrequency('loc_1');

      expect(result).toBe(5);
    });

    it('should return 0 for non-existent location', async () => {
      const mockLocations = [
        {
          id: 'loc_1',
          latitude: 40.7128,
          longitude: -74.0060,
          name: 'New York',
          address: '123 Main St',
          validated: true,
          frequency: 1,
          lastUsed: Date.now()
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLocations));

      const result = await LocationStorage.getLocationFrequency('non_existent');

      expect(result).toBe(0);
    });
  });

  describe('clearAllLocations', () => {
    it('should clear all locations from AsyncStorage', async () => {
      AsyncStorage.removeItem.mockResolvedValue(undefined);

      await LocationStorage.clearAllLocations();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('recent_locations');
    });
  });
});
