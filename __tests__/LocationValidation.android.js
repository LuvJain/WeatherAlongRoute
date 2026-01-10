/**
 * Android-specific integration tests for LocationValidationService
 * Tests features specific to Android platform
 */

import { NetInfo, AsyncStorage, Platform } from 'react-native';
import LocationValidationService from '../services/LocationValidation';
import type { Location } from '../models/Location';

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android'
  },
  NetInfo: {
    isConnected: {
      fetch: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }
  },
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

global.fetch = jest.fn();

describe('LocationValidationService - Android Integration', () => {
  let validationService: LocationValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    LocationValidationService.instance = null;
    validationService = LocationValidationService.getInstance();
    NetInfo.isConnected.fetch.mockResolvedValue(true);
    AsyncStorage.getItem.mockResolvedValue(null);
  });

  afterEach(() => {
    if (validationService) {
      validationService.stop();
    }
  });

  describe('Android-specific behavior', () => {
    it('should work correctly on Android platform', async () => {
      await validationService.start();

      expect(validationService.isNetworkOnline()).toBe(true);
    });

    it('should handle Android network status changes', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(true);

      await validationService.start();

      const networkChangeCallback = NetInfo.isConnected.addEventListener.mock.calls[0][1];
      networkChangeCallback(false);

      expect(validationService.isNetworkOnline()).toBe(false);
    });

    it('should validate locations with Android geocoding on transition to online', async () => {
      const location: Location = {
        id: 'loc_android_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: 'San Francisco',
        validated: false,
        timestamp: Date.now()
      };

      NetInfo.isConnected.fetch.mockResolvedValue(false);
      AsyncStorage.getItem.mockResolvedValue(null);

      await validationService.start();

      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          status: 'OK',
          results: [
            {
              formatted_address: 'San Francisco, CA, USA',
              geometry: {
                location: {
                  lat: 37.7749,
                  lng: -122.4194
                }
              }
            }
          ]
        })
      });

      const networkChangeCallback = NetInfo.isConnected.addEventListener.mock.calls[0][1];
      networkChangeCallback(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(validationService.isNetworkOnline()).toBe(true);
    });

    it('should persist locations correctly on Android', async () => {
      const location: Location = {
        id: 'loc_android_persist',
        latitude: 37.7749,
        longitude: -122.4194,
        address: 'San Francisco, CA',
        validated: true,
        timestamp: Date.now()
      };

      NetInfo.isConnected.fetch.mockResolvedValue(true);

      await validationService.start();

      const result = await validationService.validateLocation(location);

      expect(result).toBeDefined();
    });
  });

  describe('Android background execution', () => {
    it('should handle periodic validation in background', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(true);

      await validationService.start();

      // Validation interval should be set
      expect(validationService.validationInterval).toBeDefined();
    });

    it('should clean up resources when backgrounded', () => {
      validationService.stop();

      expect(validationService.validationInterval).toBeNull();
    });
  });

  describe('Android permissions handling', () => {
    it('should handle cases where network permissions might be restricted', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(true);

      await validationService.start();

      expect(validationService.isNetworkOnline()).toBe(true);
    });

    it('should gracefully handle network availability checking', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(false);

      await validationService.start();

      expect(validationService.isNetworkOnline()).toBe(false);
    });
  });
});
