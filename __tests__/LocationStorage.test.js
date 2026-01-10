import LocationStorage from '../services/LocationStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLocation, generateLocationId } from '../models/Location';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('LocationStorage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('saveLocation', () => {
    it('should save a new location', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const location = createLocation(
        40.7128,
        -74.0060,
        '123 Main St',
        'New York',
        'USA',
        '10001',
        true
      );

      const result = await LocationStorage.saveLocation(location);

      expect(result).toBeDefined();
      expect(result.id).toBe(location.id);
      expect(result.frequency).toBe(1);
      expect(result.validated).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should increment frequency when saving duplicate location', async () => {
      const location = createLocation(
        40.7128,
        -74.0060,
        '123 Main St',
        'New York',
        'USA',
        '10001',
        true
      );

      const recentLocation = {
        ...location,
        frequency: 2,
        lastUsed: Date.now() - 10000
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([recentLocation]));

      const result = await LocationStorage.saveLocation(location);

      expect(result.frequency).toBe(3);
      expect(result.lastUsed).toBeGreaterThan(recentLocation.lastUsed);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should move duplicate location to front of list', async () => {
      const location1 = createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true);
      const location2 = createLocation(51.5074, -0.1278, '456 Oxford St', 'London', 'UK', 'WC1A1BB', true);

      const recent1 = { ...location1, frequency: 1, lastUsed: Date.now() };
      const recent2 = { ...location2, frequency: 2, lastUsed: Date.now() - 10000 };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([recent2, recent1]));

      await LocationStorage.saveLocation(location1);

      const calls = AsyncStorage.setItem.mock.calls;
      const savedData = JSON.parse(calls[calls.length - 1][1]);

      expect(savedData[0].id).toBe(location1.id);
      expect(savedData[0].frequency).toBe(2);
    });

    it('should limit recent locations to 20 items', async () => {
      const locations = [];
      for (let i = 0; i < 20; i++) {
        locations.push({
          ...createLocation(i + 40, i - 74, `${i} St`, 'City', 'Country', '12345', true),
          frequency: 1,
          lastUsed: Date.now()
        });
      }

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(locations));

      const newLocation = createLocation(99.9999, 99.9999, 'New St', 'New City', 'New Country', '99999', true);
      await LocationStorage.saveLocation(newLocation);

      const calls = AsyncStorage.setItem.mock.calls;
      const savedData = JSON.parse(calls[calls.length - 1][1]);

      expect(savedData.length).toBe(20);
    });
  });

  describe('getRecentLocations', () => {
    it('should return empty array when no locations exist', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual([]);
    });

    it('should return all recent locations', async () => {
      const location1 = { ...createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true), frequency: 1, lastUsed: Date.now() };
      const location2 = { ...createLocation(51.5074, -0.1278, '456 Oxford St', 'London', 'UK', 'WC1A1BB', true), frequency: 2, lastUsed: Date.now() };

      const data = JSON.stringify([location1, location2]);
      AsyncStorage.getItem.mockResolvedValue(data);

      const result = await LocationStorage.getRecentLocations();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(location1);
      expect(result[1]).toEqual(location2);
    });
  });

  describe('getLocationById', () => {
    it('should return location by ID', async () => {
      const location = { ...createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true), frequency: 1, lastUsed: Date.now() };
      const data = JSON.stringify([location]);
      AsyncStorage.getItem.mockResolvedValue(data);

      const result = await LocationStorage.getLocationById(location.id);

      expect(result).toEqual(location);
    });

    it('should return null when location not found', async () => {
      const location = { ...createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true), frequency: 1, lastUsed: Date.now() };
      const data = JSON.stringify([location]);
      AsyncStorage.getItem.mockResolvedValue(data);

      const result = await LocationStorage.getLocationById('nonexistent_id');

      expect(result).toBeNull();
    });
  });

  describe('deleteLocation', () => {
    it('should delete location by ID', async () => {
      const location1 = { ...createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true), frequency: 1, lastUsed: Date.now() };
      const location2 = { ...createLocation(51.5074, -0.1278, '456 Oxford St', 'London', 'UK', 'WC1A1BB', true), frequency: 1, lastUsed: Date.now() };

      const data = JSON.stringify([location1, location2]);
      AsyncStorage.getItem.mockResolvedValue(data);

      await LocationStorage.deleteLocation(location1.id);

      const calls = AsyncStorage.setItem.mock.calls;
      const savedData = JSON.parse(calls[calls.length - 1][1]);

      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe(location2.id);
    });

    it('should not throw error when deleting nonexistent location', async () => {
      const location = { ...createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true), frequency: 1, lastUsed: Date.now() };
      const data = JSON.stringify([location]);
      AsyncStorage.getItem.mockResolvedValue(data);

      await expect(LocationStorage.deleteLocation('nonexistent_id')).resolves.not.toThrow();
    });
  });

  describe('clearAllLocations', () => {
    it('should clear all locations', async () => {
      await LocationStorage.clearAllLocations();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('recentLocations');
    });
  });

  describe('getLocationsByFrequency', () => {
    it('should return locations sorted by frequency (highest first)', async () => {
      const location1 = { ...createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true), frequency: 5, lastUsed: Date.now() };
      const location2 = { ...createLocation(51.5074, -0.1278, '456 Oxford St', 'London', 'UK', 'WC1A1BB', true), frequency: 2, lastUsed: Date.now() };
      const location3 = { ...createLocation(48.8566, 2.3522, '789 Rue St', 'Paris', 'France', '75001', true), frequency: 10, lastUsed: Date.now() };

      const data = JSON.stringify([location1, location2, location3]);
      AsyncStorage.getItem.mockResolvedValue(data);

      const result = await LocationStorage.getLocationsByFrequency();

      expect(result[0].frequency).toBe(10);
      expect(result[1].frequency).toBe(5);
      expect(result[2].frequency).toBe(2);
    });
  });

  describe('getLocationsByLastUsed', () => {
    it('should return locations sorted by last used (most recent first)', async () => {
      const now = Date.now();
      const location1 = { ...createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true), frequency: 1, lastUsed: now - 5000 };
      const location2 = { ...createLocation(51.5074, -0.1278, '456 Oxford St', 'London', 'UK', 'WC1A1BB', true), frequency: 1, lastUsed: now };
      const location3 = { ...createLocation(48.8566, 2.3522, '789 Rue St', 'Paris', 'France', '75001', true), frequency: 1, lastUsed: now - 10000 };

      const data = JSON.stringify([location1, location2, location3]);
      AsyncStorage.getItem.mockResolvedValue(data);

      const result = await LocationStorage.getLocationsByLastUsed();

      expect(result[0].lastUsed).toBe(now);
      expect(result[1].lastUsed).toBe(now - 5000);
      expect(result[2].lastUsed).toBe(now - 10000);
    });
  });

  describe('getLocationCount', () => {
    it('should return count of saved locations', async () => {
      const location1 = { ...createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true), frequency: 1, lastUsed: Date.now() };
      const location2 = { ...createLocation(51.5074, -0.1278, '456 Oxford St', 'London', 'UK', 'WC1A1BB', true), frequency: 1, lastUsed: Date.now() };

      const data = JSON.stringify([location1, location2]);
      AsyncStorage.getItem.mockResolvedValue(data);

      const result = await LocationStorage.getLocationCount();

      expect(result).toBe(2);
    });

    it('should return 0 when no locations exist', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await LocationStorage.getLocationCount();

      expect(result).toBe(0);
    });
  });
});
