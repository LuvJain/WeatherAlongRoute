import { AsyncStorage } from 'react-native';
import LocationStorageService from '../services/LocationStorage';
import type { Location, RecentLocation } from '../models/Location';

// Mock AsyncStorage
jest.mock('react-native', () => ({
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

describe('LocationStorage Service (iOS)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AsyncStorage mock to return empty array by default
    AsyncStorage.getItem.mockResolvedValue(null);
  });

  describe('saveLocation', () => {
    it('should save a new location to storage', async () => {
      const location: Location = {
        id: '1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA',
        name: 'Test Location',
        placeId: 'place123',
        validated: true,
        timestamp: Date.now()
      };

      AsyncStorage.getItem.mockResolvedValue(null);

      await LocationStorageService.saveLocation(location);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const [key, value] = AsyncStorage.setItem.mock.calls[0];
      expect(key).toBe('recentLocations');
      const savedData = JSON.parse(value);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].location).toEqual(location);
      expect(savedData[0].frequency).toBe(1);
    });

    it('should increment frequency for duplicate locations', async () => {
      const location: Location = {
        id: '1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA',
        name: 'Test Location',
        placeId: 'place123',
        validated: true,
        timestamp: Date.now()
      };

      const existingData: Array<RecentLocation> = [
        {
          location: {
            id: '1',
            latitude: 37.7749,
            longitude: -122.4194,
            address: '123 Main St, San Francisco, CA',
            name: 'Test Location',
            placeId: 'place123',
            validated: true,
            timestamp: Date.now() - 1000
          },
          frequency: 2,
          lastUsed: Date.now() - 1000
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingData));

      await LocationStorageService.saveLocation(location);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const [key, value] = AsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(value);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].frequency).toBe(3);
    });

    it('should maintain max 20 recent locations', async () => {
      const locations = Array.from({ length: 20 }, (_, i) => ({
        location: {
          id: String(i),
          latitude: 37.7749 + i,
          longitude: -122.4194 + i,
          address: `${i} Main St, San Francisco, CA`,
          validated: true,
          timestamp: Date.now()
        },
        frequency: 1,
        lastUsed: Date.now()
      }));

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(locations));

      const newLocation: Location = {
        id: '21',
        latitude: 37.8,
        longitude: -122.5,
        address: '21 Main St, San Francisco, CA',
        validated: true,
        timestamp: Date.now()
      };

      await LocationStorageService.saveLocation(newLocation);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const [key, value] = AsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(value);
      expect(savedData).toHaveLength(20);
    });
  });

  describe('getRecentLocations', () => {
    it('should retrieve recent locations from storage', async () => {
      const mockData: Array<RecentLocation> = [
        {
          location: {
            id: '1',
            latitude: 37.7749,
            longitude: -122.4194,
            address: '123 Main St, San Francisco, CA',
            validated: true,
            timestamp: Date.now()
          },
          frequency: 2,
          lastUsed: Date.now()
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const result = await LocationStorageService.getRecentLocations();

      expect(result).toEqual(mockData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('recentLocations');
    });

    it('should return empty array when no locations stored', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await LocationStorageService.getRecentLocations();

      expect(result).toEqual([]);
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location from storage', async () => {
      const mockData: Array<RecentLocation> = [
        {
          location: {
            id: '1',
            latitude: 37.7749,
            longitude: -122.4194,
            address: '123 Main St, San Francisco, CA',
            validated: true,
            timestamp: Date.now()
          },
          frequency: 1,
          lastUsed: Date.now()
        },
        {
          location: {
            id: '2',
            latitude: 37.8,
            longitude: -122.5,
            address: '456 Oak Ave, San Francisco, CA',
            validated: true,
            timestamp: Date.now()
          },
          frequency: 1,
          lastUsed: Date.now()
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      await LocationStorageService.deleteLocation('1');

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const [key, value] = AsyncStorage.setItem.mock.calls[0];
      const savedData = JSON.parse(value);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].location.id).toBe('2');
    });
  });

  describe('clearAllLocations', () => {
    it('should clear all locations from storage', async () => {
      await LocationStorageService.clearAllLocations();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('recentLocations');
    });
  });

  describe('getLocationById', () => {
    it('should retrieve a location by ID', async () => {
      const location: Location = {
        id: '1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA',
        validated: true,
        timestamp: Date.now()
      };

      const mockData: Array<RecentLocation> = [
        {
          location,
          frequency: 1,
          lastUsed: Date.now()
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const result = await LocationStorageService.getLocationById('1');

      expect(result).toEqual(location);
    });

    it('should return null if location not found', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await LocationStorageService.getLocationById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('frequency increment', () => {
    it('should properly increment frequency on multiple saves of same location', async () => {
      const location: Location = {
        id: '1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA',
        validated: true,
        timestamp: Date.now()
      };

      // First save
      AsyncStorage.getItem.mockResolvedValue(null);
      await LocationStorageService.saveLocation(location);

      let savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData[0].frequency).toBe(1);

      // Second save (duplicate)
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedData));
      await LocationStorageService.saveLocation(location);

      savedData = JSON.parse(AsyncStorage.setItem.mock.calls[1][1]);
      expect(savedData[0].frequency).toBe(2);

      // Third save (duplicate)
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedData));
      await LocationStorageService.saveLocation(location);

      savedData = JSON.parse(AsyncStorage.setItem.mock.calls[2][1]);
      expect(savedData[0].frequency).toBe(3);
    });
  });
});
