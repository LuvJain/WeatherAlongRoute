import LocationStorage from '../services/LocationStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLocation, generateLocationId } from '../models/Location';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('LocationStorage - Android', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('saveLocation', () => {
    it('should save a new location on Android', async () => {
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

    it('should increment frequency when saving duplicate location on Android', async () => {
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

    it('should move duplicate location to front of list on Android', async () => {
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

    it('should limit recent locations to 20 items on Android', async () => {
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
    it('should return empty array when no locations exist on Android', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await LocationStorage.getRecentLocations();

      expect(result).toEqual([]);
    });

    it('should return all recent locations on Android', async () => {
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

  describe('deleteLocation', () => {
    it('should delete location by ID on Android', async () => {
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
  });

  describe('frequency increment', () => {
    it('should properly track frequency increments on Android', async () => {
      const location = createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true);

      // First save
      AsyncStorage.getItem.mockResolvedValue(null);
      let result = await LocationStorage.saveLocation(location);
      expect(result.frequency).toBe(1);

      // Second save (duplicate)
      const recentLocation = {
        ...location,
        frequency: 1,
        lastUsed: Date.now()
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([recentLocation]));
      result = await LocationStorage.saveLocation(location);
      expect(result.frequency).toBe(2);

      // Third save (duplicate)
      const recentLocation2 = {
        ...location,
        frequency: 2,
        lastUsed: Date.now()
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([recentLocation2]));
      result = await LocationStorage.saveLocation(location);
      expect(result.frequency).toBe(3);
    });
  });

  describe('getLocationCount', () => {
    it('should return count of saved locations on Android', async () => {
      const location1 = { ...createLocation(40.7128, -74.0060, '123 Main St', 'New York', 'USA', '10001', true), frequency: 1, lastUsed: Date.now() };
      const location2 = { ...createLocation(51.5074, -0.1278, '456 Oxford St', 'London', 'UK', 'WC1A1BB', true), frequency: 1, lastUsed: Date.now() };

      const data = JSON.stringify([location1, location2]);
      AsyncStorage.getItem.mockResolvedValue(data);

      const result = await LocationStorage.getLocationCount();

      expect(result).toBe(2);
    });
  });
});
