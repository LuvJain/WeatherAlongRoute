import 'react-native';
import { AsyncStorage } from 'react-native';
import LocationStorage from '../services/LocationStorage';
import type { Location, RecentLocation } from '../models/Location';

// Mock AsyncStorage
jest.mock('react-native', () => ({
  AsyncStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('LocationStorage', () => {
  const mockLocation: Location = {
    id: 'loc-1',
    name: 'San Francisco',
    address: '123 Main St, San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
    placeId: 'ChIJIQBpAG2ahYAR_6128GltTXQ',
    timestamp: 1609459200000,
    validated: true,
  };

  const mockLocation2: Location = {
    id: 'loc-2',
    name: 'New York',
    address: '456 Park Ave, New York, NY',
    latitude: 40.7128,
    longitude: -74.0060,
    placeId: 'ChIJOwg_06VPwokRYv534QaPC8g',
    timestamp: 1609545600000,
    validated: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveLocation', () => {
    it('should save a new location to AsyncStorage', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      await LocationStorage.saveLocation(mockLocation);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'recent_locations',
        JSON.stringify([
          {
            ...mockLocation,
            frequency: 1,
          },
        ])
      );
    });

    it('should save multiple locations', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      await LocationStorage.saveLocation(mockLocation);
      await LocationStorage.saveLocation(mockLocation2);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      const error = new Error('Storage error');
      AsyncStorage.getItem.mockRejectedValue(error);

      await expect(LocationStorage.saveLocation(mockLocation)).rejects.toThrow('Storage error');
    });
  });

  describe('getRecentLocations', () => {
    it('should retrieve empty array when no locations exist', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const locations = await LocationStorage.getRecentLocations();

      expect(locations).toEqual([]);
    });

    it('should retrieve stored locations', async () => {
      const storedLocations: RecentLocation[] = [
        { ...mockLocation, frequency: 2 },
        { ...mockLocation2, frequency: 1 },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedLocations));

      const locations = await LocationStorage.getRecentLocations();

      expect(locations).toEqual(storedLocations);
    });

    it('should return empty array on AsyncStorage error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const locations = await LocationStorage.getRecentLocations();

      expect(locations).toEqual([]);
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location by ID', async () => {
      const storedLocations: RecentLocation[] = [
        { ...mockLocation, frequency: 1 },
        { ...mockLocation2, frequency: 1 },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedLocations));

      await LocationStorage.deleteLocation('loc-1');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'recent_locations',
        JSON.stringify([{ ...mockLocation2, frequency: 1 }])
      );
    });

    it('should handle deletion of non-existent location', async () => {
      const storedLocations: RecentLocation[] = [{ ...mockLocation, frequency: 1 }];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedLocations));

      await LocationStorage.deleteLocation('non-existent');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'recent_locations',
        JSON.stringify(storedLocations)
      );
    });

    it('should handle AsyncStorage errors', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(LocationStorage.deleteLocation('loc-1')).rejects.toThrow('Storage error');
    });
  });

  describe('Duplicate location handling', () => {
    it('should increment frequency for duplicate location', async () => {
      const existingLocations: RecentLocation[] = [
        { ...mockLocation, frequency: 1 },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingLocations));

      // Save the same location again
      await LocationStorage.saveLocation(mockLocation);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'recent_locations',
        JSON.stringify([
          {
            ...mockLocation,
            frequency: 2,
            timestamp: expect.any(Number),
          },
        ])
      );
    });

    it('should maintain max 20 recent locations', async () => {
      // Create 21 locations
      const locations: RecentLocation[] = Array.from({ length: 21 }, (_, i) => ({
        id: `loc-${i}`,
        name: `Location ${i}`,
        address: `Address ${i}`,
        latitude: 37.7749 + i,
        longitude: -122.4194 + i,
        timestamp: 1609459200000 + i,
        validated: true,
        frequency: 21 - i, // Higher frequency for earlier items
      }));

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(locations));

      // Add another location
      await LocationStorage.saveLocation({
        ...mockLocation,
        id: 'loc-new',
        frequency: 1,
      });

      // Get the argument passed to setItem
      const callArg = AsyncStorage.setItem.mock.calls[0][1];
      const savedLocations = JSON.parse(callArg);

      // Should only have 20 locations
      expect(savedLocations.length).toBeLessThanOrEqual(20);
    });

    it('should sort locations by frequency (descending)', async () => {
      const locations: RecentLocation[] = [
        { ...mockLocation, frequency: 1 },
        { ...mockLocation2, frequency: 3 },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(locations));

      const newLocation: Location = {
        id: 'loc-3',
        name: 'Boston',
        address: '789 State St, Boston, MA',
        latitude: 42.3601,
        longitude: -71.0589,
        timestamp: 1609632000000,
        validated: true,
      };

      await LocationStorage.saveLocation(newLocation);

      const callArg = AsyncStorage.setItem.mock.calls[0][1];
      const savedLocations = JSON.parse(callArg);

      // First location should have higher frequency
      expect(savedLocations[0].frequency).toBeGreaterThanOrEqual(savedLocations[1].frequency);
    });
  });

  describe('getLocationById', () => {
    it('should retrieve a location by ID', async () => {
      const storedLocations: RecentLocation[] = [
        { ...mockLocation, frequency: 2 },
        { ...mockLocation2, frequency: 1 },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedLocations));

      const location = await LocationStorage.getLocationById('loc-1');

      expect(location).toEqual({ ...mockLocation, frequency: 2 });
    });

    it('should return null for non-existent location', async () => {
      const storedLocations: RecentLocation[] = [{ ...mockLocation, frequency: 1 }];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedLocations));

      const location = await LocationStorage.getLocationById('non-existent');

      expect(location).toBeNull();
    });

    it('should return null on AsyncStorage error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const location = await LocationStorage.getLocationById('loc-1');

      expect(location).toBeNull();
    });
  });

  describe('getLocationFrequency', () => {
    it('should return frequency for existing location', async () => {
      const storedLocations: RecentLocation[] = [
        { ...mockLocation, frequency: 5 },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedLocations));

      const frequency = await LocationStorage.getLocationFrequency('loc-1');

      expect(frequency).toBe(5);
    });

    it('should return 0 for non-existent location', async () => {
      const storedLocations: RecentLocation[] = [{ ...mockLocation, frequency: 1 }];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedLocations));

      const frequency = await LocationStorage.getLocationFrequency('non-existent');

      expect(frequency).toBe(0);
    });

    it('should return 0 on AsyncStorage error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const frequency = await LocationStorage.getLocationFrequency('loc-1');

      expect(frequency).toBe(0);
    });
  });

  describe('clearAllLocations', () => {
    it('should clear all locations', async () => {
      await LocationStorage.clearAllLocations();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('recent_locations');
    });

    it('should handle AsyncStorage errors', async () => {
      AsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      await expect(LocationStorage.clearAllLocations()).rejects.toThrow('Storage error');
    });
  });
});
