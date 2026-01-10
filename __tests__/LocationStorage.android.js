import 'react-native';
import { AsyncStorage } from 'react-native';
import LocationStorage from '../services/LocationStorage';
import { createLocation } from '../models/Location';

// Mock AsyncStorage
jest.mock('react-native', () => ({
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('LocationStorage Android Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveLocation', () => {
    it('should save a new location to AsyncStorage', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(null);

      const location = createLocation(40.7128, -74.006, '123 Main St', 'NYC', true);
      const result = await LocationStorage.saveLocation(location);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].location.latitude).toBe(40.7128);
      expect(result[0].location.longitude).toBe(-74.006);
      expect(result[0].frequency).toBe(1);
    });

    it('should increment frequency for duplicate locations', async () => {
      const location = createLocation(40.7128, -74.006, '123 Main St', 'NYC', true);
      const recentLocation = {
        id: location.id,
        location,
        frequency: 1,
        lastUsed: Date.now(),
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([recentLocation]));
      AsyncStorage.setItem.mockResolvedValue(null);

      const result = await LocationStorage.saveLocation(location);

      expect(result[0].frequency).toBe(2);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should maintain max 20 recent locations', async () => {
      const locations = Array.from({ length: 20 }, (_, i) =>
        createLocation(40 + i * 0.001, -74 + i * 0.001, `St ${i}`, `Place ${i}`, true)
      );

      const recentLocations = locations.map((loc) => ({
        id: loc.id,
        location: loc,
        frequency: 1,
        lastUsed: Date.now(),
      }));

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(recentLocations));
      AsyncStorage.setItem.mockResolvedValue(null);

      const newLocation = createLocation(50.0, -75.0, 'New St', 'New Place', true);
      const result = await LocationStorage.saveLocation(newLocation);

      expect(result).toHaveLength(20);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('getRecentLocations', () => {
    it('should retrieve all recent locations', async () => {
      const location = createLocation(40.7128, -74.006, '123 Main St', 'NYC', true);
      const recentLocations = [
        {
          id: location.id,
          location,
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(recentLocations));

      const result = await LocationStorage.getRecentLocations();

      expect(result).toHaveLength(1);
      expect(result[0].location.latitude).toBe(40.7128);
    });

    it('should return empty array if no locations stored', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual([]);
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location by ID', async () => {
      const location = createLocation(40.7128, -74.006, '123 Main St', 'NYC', true);
      const recentLocations = [
        {
          id: location.id,
          location,
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(recentLocations));
      AsyncStorage.setItem.mockResolvedValue(null);

      const result = await LocationStorage.deleteLocation(location.id);

      expect(result).toHaveLength(0);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should not fail if location ID does not exist', async () => {
      const location = createLocation(40.7128, -74.006, '123 Main St', 'NYC', true);
      const recentLocations = [
        {
          id: location.id,
          location,
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(recentLocations));
      AsyncStorage.setItem.mockResolvedValue(null);

      const result = await LocationStorage.deleteLocation('nonexistent_id');

      expect(result).toHaveLength(1);
    });
  });

  describe('clearAllLocations', () => {
    it('should clear all locations from storage', async () => {
      AsyncStorage.removeItem.mockResolvedValue(null);

      await LocationStorage.clearAllLocations();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@WeatherAlongRoute:locations');
    });
  });

  describe('getLocationById', () => {
    it('should retrieve a specific location by ID', async () => {
      const location = createLocation(40.7128, -74.006, '123 Main St', 'NYC', true);
      const recentLocations = [
        {
          id: location.id,
          location,
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(recentLocations));

      const result = await LocationStorage.getLocationById(location.id);

      expect(result).not.toBeNull();
      expect(result.location.latitude).toBe(40.7128);
    });

    it('should return null if location ID not found', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await LocationStorage.getLocationById('nonexistent_id');

      expect(result).toBeNull();
    });
  });

  describe('frequency increment', () => {
    it('should increment frequency when same location is saved multiple times', async () => {
      const location = createLocation(40.7128, -74.006, '123 Main St', 'NYC', true);

      // First save
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue(null);
      await LocationStorage.saveLocation(location);

      // Second save - simulate getting the previously saved location
      const firstSavedLocations = [
        {
          id: location.id,
          location,
          frequency: 1,
          lastUsed: Date.now(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(firstSavedLocations));

      const result = await LocationStorage.saveLocation(location);

      expect(result[0].frequency).toBe(2);
    });
  });
});
