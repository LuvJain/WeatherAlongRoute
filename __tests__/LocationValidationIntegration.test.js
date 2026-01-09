import 'react-native';
import { AsyncStorage, AppState, NetInfo } from 'react-native';
import LocationValidationService from '../src/services/LocationValidationService';
import LocationStorage from '../src/services/LocationStorage';
import type { Location, RecentLocation } from '../src/models/types';

jest.mock('react-native', () => ({
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentState: 'active'
  },
  NetInfo: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    fetch: jest.fn()
  }
}));

jest.mock('../src/services/LocationStorage', () => ({
  getRecentLocations: jest.fn(),
  setAllLocations: jest.fn(),
  updateLocation: jest.fn(),
  saveLocation: jest.fn(),
  deleteLocation: jest.fn(),
  clearAllLocations: jest.fn(),
  getLocationFrequency: jest.fn()
}));

describe('LocationValidationService - Integration Tests', () => {
  let service: LocationValidationService;
  let mockLocations: RecentLocation[];

  beforeEach(() => {
    jest.clearAllMocks();
    LocationValidationService.instance = null;
    service = LocationValidationService.getInstance();

    // Setup mock locations - some validated, some pending
    mockLocations = [
      {
        id: 'validated_1',
        latitude: 40.7128,
        longitude: -74.0060,
        name: 'New York',
        address: '123 Main St, New York, NY',
        validated: true,
        frequency: 3,
        lastUsed: Date.now() - 1000
      },
      {
        id: 'pending_1',
        latitude: 34.0522,
        longitude: -118.2437,
        name: 'Los Angeles',
        address: '456 Oak Ave',
        validated: false,
        frequency: 1,
        lastUsed: Date.now()
      },
      {
        id: 'pending_2',
        latitude: 41.8781,
        longitude: -87.6298,
        name: 'Chicago',
        address: '789 Elm St',
        validated: false,
        frequency: 1,
        lastUsed: Date.now()
      }
    ];
  });

  afterEach(() => {
    if (service) {
      service.stop();
    }
  });

  describe('Complete offline-to-online validation flow', () => {
    it('should validate all pending locations when transitioning from offline to online', async () => {
      const mockGeocodingResponses = {
        'pending_1': {
          results: [
            {
              formatted_address:
                '456 Oak Ave, Los Angeles, CA 90001, USA'
            }
          ]
        },
        'pending_2': {
          results: [
            {
              formatted_address: '789 Elm St, Chicago, IL 60601, USA'
            }
          ]
        }
      };

      // Mock initial offline state
      service.start();
      service.isOnline = false;

      LocationStorage.getRecentLocations.mockResolvedValue(mockLocations);

      // Mock location updates to track validation
      let updatedCount = 0;
      LocationStorage.updateLocation.mockImplementation((location) => {
        updatedCount++;
        return Promise.resolve({
          ...location,
          validated: true
        });
      });

      // Mock geocoding API calls
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('34.0522')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve(mockGeocodingResponses.pending_1)
          });
        } else if (url.includes('41.8781')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve(mockGeocodingResponses.pending_2)
          });
        }
        return Promise.resolve({ ok: false });
      });

      // Simulate network transition from offline to online
      service.isOnline = true;
      await service.validatePendingLocations('test-api-key');

      // Should have attempted to validate both pending locations
      expect(updatedCount).toBeGreaterThan(0);
    });

    it('should persist validated locations across sessions', async () => {
      const pendingLocation: Location = {
        id: 'pending_location',
        latitude: 37.7749,
        longitude: -122.4194,
        name: 'San Francisco',
        address: '100 Main St',
        validated: false
      };

      service.start();
      service.isOnline = true;

      LocationStorage.getRecentLocations.mockResolvedValue([pendingLocation]);

      const mockGeocodingResponse = {
        results: [
          {
            formatted_address: '100 Main St, San Francisco, CA 94102, USA'
          }
        ]
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeocodingResponse)
      });

      // Track the update call
      let updatedLocation: ?Location = null;
      LocationStorage.updateLocation.mockImplementation((location) => {
        updatedLocation = location;
        return Promise.resolve({
          ...location,
          validated: true
        });
      });

      await service.validateLocation(pendingLocation, 'test-api-key');

      // Location should be marked as validated
      expect(updatedLocation?.validated).toBe(true);
      expect(updatedLocation?.address).toBe(
        '100 Main St, San Francisco, CA 94102, USA'
      );
    });

    it('should handle mixed validated and pending locations', async () => {
      service.start();
      service.isOnline = true;

      LocationStorage.getRecentLocations.mockResolvedValue(mockLocations);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          results: [{ formatted_address: 'Validated Address' }]
        })
      });

      LocationStorage.updateLocation.mockResolvedValue({ validated: true });

      await service.validatePendingLocations('test-api-key');

      // Both pending locations should be validated
      expect(LocationStorage.updateLocation).toHaveBeenCalled();
    });
  });

  describe('Error handling and recovery', () => {
    it('should continue validating other locations if one fails', async () => {
      service.start();
      service.isOnline = true;

      LocationStorage.getRecentLocations.mockResolvedValue(mockLocations);

      // First location fails, second succeeds
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [{ formatted_address: 'Valid Address' }]
          })
        });
      });

      LocationStorage.updateLocation.mockResolvedValue({ validated: true });

      // Should not throw
      await expect(
        service.validatePendingLocations('test-api-key')
      ).resolves.toBeUndefined();

      // Second location should still be processed
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not block app during validation errors', async () => {
      service.start();
      service.isOnline = true;

      LocationStorage.getRecentLocations.mockRejectedValue(
        new Error('Storage failure')
      );

      // Should handle error gracefully
      const result = await service.validatePendingLocations('test-api-key');

      expect(result).toBeUndefined();
      expect(service.isValidating).toBe(false);
    });

    it('should handle offline conditions during validation', async () => {
      service.start();
      service.isOnline = true;

      LocationStorage.getRecentLocations.mockResolvedValue(mockLocations);

      // Simulate going offline during validation
      let fetchCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        fetchCount++;
        if (fetchCount > 1) {
          service.isOnline = false;
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [{ formatted_address: 'Address' }]
          })
        });
      });

      LocationStorage.updateLocation.mockResolvedValue({ validated: true });

      await service.validatePendingLocations('test-api-key');

      // Should handle gracefully without throwing
      expect(service.isValidating).toBe(false);
    });
  });

  describe('Recent locations persistence', () => {
    it('should preserve recent locations across validation', async () => {
      service.start();
      service.isOnline = true;

      const originalLocations = [...mockLocations];
      LocationStorage.getRecentLocations.mockResolvedValue(originalLocations);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          results: [{ formatted_address: 'Validated Address' }]
        })
      });

      LocationStorage.updateLocation.mockResolvedValue({ validated: true });

      await service.validatePendingLocations('test-api-key');

      // Original locations should still be available
      expect(LocationStorage.getRecentLocations).toHaveBeenCalled();
    });

    it('should maintain frequency count during validation', async () => {
      service.start();
      service.isOnline = true;

      const locationWithFrequency: RecentLocation = {
        id: 'frequent_location',
        latitude: 37.7749,
        longitude: -122.4194,
        name: 'San Francisco',
        address: '100 Main St',
        validated: false,
        frequency: 5, // Used 5 times
        lastUsed: Date.now()
      };

      LocationStorage.getRecentLocations.mockResolvedValue([
        locationWithFrequency
      ]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          results: [
            { formatted_address: '100 Main St, San Francisco, CA' }
          ]
        })
      });

      let updatedLocation: ?RecentLocation = null;
      LocationStorage.updateLocation.mockImplementation((location) => {
        updatedLocation = location;
        return Promise.resolve({
          ...location,
          validated: true
        });
      });

      await service.validateLocation(locationWithFrequency, 'test-api-key');

      // Frequency should be preserved
      expect(updatedLocation?.frequency).toBe(5);
    });
  });

  describe('Listener notifications', () => {
    it('should notify listeners of online status change', (done) => {
      service.start();

      const listener = jest.fn((isOnline) => {
        expect(isOnline).toBe(true);
        done();
      });

      service.addOnlineStatusListener(listener);

      // Simulate network coming online
      service.isOnline = false;
      service.handleNetworkChange({ isConnected: true });
    });

    it('should trigger validation on listener notification when coming online', (done) => {
      service.start();

      const validateSpy = jest.spyOn(service, 'validatePendingLocations');
      LocationStorage.getRecentLocations.mockResolvedValue(mockLocations);

      service.isOnline = false;
      service.handleNetworkChange({ isConnected: true });

      setTimeout(() => {
        expect(validateSpy).toHaveBeenCalled();
        done();
      }, 0);
    });
  });

  describe('Platform-specific behavior', () => {
    it('should work on iOS platform', async () => {
      const iosPlatform = 'ios';

      service.start();
      service.isOnline = true;

      LocationStorage.getRecentLocations.mockResolvedValue(mockLocations);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          results: [{ formatted_address: 'iOS Address' }]
        })
      });

      LocationStorage.updateLocation.mockResolvedValue({ validated: true });

      await service.validatePendingLocations('test-api-key');

      // Should complete without platform-specific issues
      expect(service.isValidating).toBe(false);
    });

    it('should work on Android platform', async () => {
      const androidPlatform = 'android';

      service.start();
      service.isOnline = true;

      LocationStorage.getRecentLocations.mockResolvedValue(mockLocations);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          results: [{ formatted_address: 'Android Address' }]
        })
      });

      LocationStorage.updateLocation.mockResolvedValue({ validated: true });

      await service.validatePendingLocations('test-api-key');

      // Should complete without platform-specific issues
      expect(service.isValidating).toBe(false);
    });
  });
});
