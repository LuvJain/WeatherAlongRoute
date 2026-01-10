// @flow

/**
 * Android-specific LocationValidationService Integration Tests
 * Tests offline-to-online validation flow on Android platform
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { NetInfo, AsyncStorage } from 'react-native';
import LocationValidationService from '../services/LocationValidationService';
import LocationStorage from '../services/LocationStorage';
import type { Location } from '../models/Location';

// Mock NetInfo for Android
jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  const eventListeners = {};

  return {
    ...actualRN,
    NetInfo: {
      isConnected: {
        addEventListener: jest.fn((event, callback) => {
          if (!eventListeners[event]) {
            eventListeners[event] = [];
          }
          eventListeners[event].push(callback);
        }),
        removeEventListener: jest.fn((event, callback) => {
          if (eventListeners[event]) {
            eventListeners[event] = eventListeners[event].filter(
              (cb) => cb !== callback
            );
          }
        }),
        fetch: jest.fn().mockResolvedValue(true),
      },
      _eventListeners: eventListeners,
    },
    AsyncStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    },
    Geolocation: {
      getCurrentPosition: jest.fn(),
    },
  };
});

jest.mock('react-native-google-places-autocomplete', () => ({
  GooglePlacesAutocomplete: ({ onPress, placeholder, styles }) => (
    <View testID="google-places-autocomplete">
      <Text>{placeholder}</Text>
    </View>
  ),
}));

jest.mock('../services/LocationStorage', () => {
  return {
    getRecentLocations: jest.fn(),
    saveLocation: jest.fn(),
    deleteLocation: jest.fn(),
  };
});

global.fetch = jest.fn();

describe('LocationValidationService Integration Tests (Android)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationValidationService.cleanup();
  });

  afterEach(() => {
    LocationValidationService.cleanup();
  });

  describe('Android Platform Offline-to-Online Flow', () => {
    it('should handle online status detection on Android', async () => {
      const { NetInfo } = require('react-native');
      const statusCallback = jest.fn();

      NetInfo.isConnected.fetch.mockResolvedValueOnce(true);

      LocationValidationService.initialize();
      LocationValidationService.subscribeToOnlineStatus(statusCallback);

      // Simulate connectivity change on Android
      const listeners = NetInfo._eventListeners['change'] || [];
      if (listeners.length > 0) {
        listeners[0](true);
      }

      await new Promise((resolve) => setImmediate(resolve));

      expect(statusCallback).toHaveBeenCalledWith(true);
    });

    it('should validate pending GPS locations on Android when coming online', async () => {
      const { NetInfo } = require('react-native');

      const gpsLocation: Location = {
        id: 'gps_android_123',
        name: 'Current Location',
        address: '40.7128, -74.006',
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: Date.now(),
        validated: false,
      };

      NetInfo.isConnected.fetch.mockResolvedValueOnce(false);
      LocationStorage.getRecentLocations.mockResolvedValueOnce([
        gpsLocation,
      ]);

      global.fetch.mockResolvedValueOnce({
        json: async () => ({
          results: [
            {
              formatted_address:
                'New York, NY, USA',
            },
          ],
        }),
      });

      LocationValidationService.initialize();

      // Simulate offline to online transition
      const listeners = NetInfo._eventListeners['change'] || [];
      if (listeners.length > 0) {
        listeners[0](true);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(LocationStorage.saveLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          validated: true,
          id: 'gps_android_123',
        })
      );
    });

    it('should handle Android Geolocation timeout gracefully', async () => {
      const { Geolocation } = require('react-native');
      const mockError = {
        code: 3, // Timeout (longer on Android than iOS)
        message: 'Timeout',
      };

      Geolocation.getCurrentPosition.mockImplementation(
        (success, error) => error(mockError)
      );

      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      LocationValidationService.initialize();

      // Should not throw
      expect(LocationValidationService.getOnlineStatus()).toBe(true);
    });

    it('should handle Wi-Fi to Mobile network transition on Android', async () => {
      const { NetInfo } = require('react-native');
      const statusCallback = jest.fn();

      NetInfo.isConnected.fetch.mockResolvedValueOnce(true);

      LocationValidationService.initialize();
      LocationValidationService.subscribeToOnlineStatus(statusCallback);

      // Simulate network transition
      const listeners = NetInfo._eventListeners['change'] || [];
      if (listeners.length > 0) {
        listeners[0](true); // Ensure online
      }

      await new Promise((resolve) => setImmediate(resolve));

      expect(statusCallback).toHaveBeenCalledWith(true);
    });
  });

  describe('Android SharedPreferences Integration', () => {
    it('should persist validation state on Android storage', async () => {
      const { AsyncStorage } = require('react-native');

      const location: Location = {
        id: 'android_persist_123',
        name: 'Test Location',
        address: 'Test Address',
        latitude: 40,
        longitude: -74,
        timestamp: Date.now(),
        validated: true,
      };

      LocationStorage.getRecentLocations.mockResolvedValueOnce([
        location,
      ]);
      LocationStorage.saveLocation.mockResolvedValueOnce(undefined);

      LocationValidationService.initialize();
      await LocationValidationService.validateLocation(location);

      expect(LocationStorage.saveLocation).toHaveBeenCalled();
    });

    it('should handle large batches of locations on Android', async () => {
      const locations: Location[] = Array.from({ length: 20 }, (_, i) => ({
        id: `android_batch_${i}`,
        name: `Location ${i}`,
        address: `Address ${i}`,
        latitude: 40 + i,
        longitude: -74 + i,
        timestamp: Date.now(),
        validated: false,
      }));

      LocationStorage.getRecentLocations.mockResolvedValueOnce(locations);

      global.fetch.mockResolvedValue({
        json: async () => ({
          results: [
            {
              formatted_address: 'Test Address',
            },
          ],
        }),
      });

      LocationValidationService.initialize();
      await LocationValidationService.validatePendingLocations();

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(LocationStorage.saveLocation).toHaveBeenCalledTimes(20);
    });
  });

  describe('Android Resource Management', () => {
    it('should cleanup listeners when service is destroyed', () => {
      const { NetInfo } = require('react-native');

      LocationValidationService.initialize();
      LocationValidationService.cleanup();

      expect(NetInfo.isConnected.removeEventListener).toHaveBeenCalled();
    });

    it('should handle rapid online/offline transitions on Android', async () => {
      const { NetInfo } = require('react-native');
      const statusCallback = jest.fn();

      NetInfo.isConnected.fetch.mockResolvedValueOnce(true);

      LocationValidationService.initialize();
      LocationValidationService.subscribeToOnlineStatus(statusCallback);

      const listeners = NetInfo._eventListeners['change'] || [];

      // Simulate rapid transitions
      if (listeners.length > 0) {
        listeners[0](false);
        listeners[0](true);
        listeners[0](false);
        listeners[0](true);
      }

      await new Promise((resolve) => setImmediate(resolve));

      expect(statusCallback).toHaveBeenCalledTimes(4);
    });

    it('should not leak memory with repeated initialization', () => {
      for (let i = 0; i < 5; i++) {
        LocationValidationService.initialize();
        LocationValidationService.cleanup();
      }

      // After cleanup, callback arrays should be empty
      expect(LocationValidationService.onlineStatusCallbacks.length).toBe(0);
      expect(LocationValidationService.locationUpdateCallbacks.length).toBe(0);
    });
  });

  describe('Android Reverse Geocoding', () => {
    it('should reverse geocode GPS coordinates on Android', async () => {
      const location: Location = {
        id: 'gps_reverse_android',
        name: 'Location',
        address: '40.7128, -74.006',
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: Date.now(),
        validated: false,
      };

      LocationStorage.getRecentLocations.mockResolvedValueOnce([
        location,
      ]);

      global.fetch.mockResolvedValueOnce({
        json: async () => ({
          results: [
            {
              formatted_address:
                'Manhattan, New York, NY 10001, USA',
            },
          ],
        }),
      });

      LocationValidationService.initialize();
      await LocationValidationService.validatePendingLocations();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/40\.7128.*-74\.006/)
      );
    });

    it('should handle reverse geocoding failures on Android', async () => {
      const location: Location = {
        id: 'gps_fail_android',
        name: 'Location',
        address: '0, 0',
        latitude: 0,
        longitude: 0,
        timestamp: Date.now(),
        validated: false,
      };

      LocationStorage.getRecentLocations.mockResolvedValueOnce([
        location,
      ]);

      global.fetch.mockRejectedValueOnce(
        new Error('Connection timeout')
      );

      LocationValidationService.initialize();

      // Should not throw
      await LocationValidationService.validatePendingLocations();

      expect(LocationValidationService.getOnlineStatus()).toBe(true);
    });
  });

  describe('Android Battery Optimization', () => {
    it('should respect periodic validation interval on Android', async () => {
      LocationStorage.getRecentLocations.mockResolvedValue([]);

      LocationValidationService.initialize();

      // Check that interval is set
      expect(LocationValidationService.validatePendingLocationsIntervalId).toBeDefined();

      LocationValidationService.cleanup();

      // Interval should be cleared
      expect(
        LocationValidationService.validatePendingLocationsIntervalId
      ).toBeNull();
    });

    it('should not validate when offline on Android', async () => {
      const { NetInfo } = require('react-native');

      NetInfo.isConnected.fetch.mockResolvedValueOnce(false);

      LocationValidationService.initialize();

      // Mark as offline
      const listeners = NetInfo._eventListeners['change'] || [];
      if (listeners.length > 0) {
        listeners[0](false);
      }

      await LocationValidationService.validatePendingLocations();

      // Should not fetch when offline
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should reduce API calls when offline on Android', async () => {
      const { NetInfo } = require('react-native');

      const locations: Location[] = Array.from({ length: 5 }, (_, i) => ({
        id: `android_offline_${i}`,
        name: `Location ${i}`,
        address: `Address ${i}`,
        latitude: 40,
        longitude: -74,
        timestamp: Date.now(),
        validated: false,
      }));

      NetInfo.isConnected.fetch.mockResolvedValueOnce(false);
      LocationStorage.getRecentLocations.mockResolvedValueOnce(locations);

      LocationValidationService.initialize();

      // Force offline status
      const listeners = NetInfo._eventListeners['change'] || [];
      if (listeners.length > 0) {
        listeners[0](false);
      }

      await LocationValidationService.validatePendingLocations();

      // No API calls should be made when offline
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Android Error Scenarios', () => {
    it('should handle null/undefined location data gracefully', async () => {
      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      LocationValidationService.initialize();

      // Should not throw with empty array
      await LocationValidationService.validatePendingLocations();

      expect(LocationValidationService.getOnlineStatus()).toBe(true);
    });

    it('should continue validation after individual location failure', async () => {
      const locations: Location[] = [
        {
          id: 'fail_1',
          name: 'Location 1',
          address: '0, 0',
          latitude: 0,
          longitude: 0,
          timestamp: Date.now(),
          validated: false,
        },
        {
          id: 'success_2',
          name: 'Location 2',
          address: '40, -74',
          latitude: 40,
          longitude: -74,
          timestamp: Date.now(),
          validated: false,
        },
      ];

      LocationStorage.getRecentLocations.mockResolvedValueOnce(locations);

      // First call fails, second succeeds
      global.fetch
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          json: async () => ({
            results: [
              {
                formatted_address: 'Success Address',
              },
            ],
          }),
        });

      LocationValidationService.initialize();
      await LocationValidationService.validatePendingLocations();

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second location should still be validated
      expect(LocationStorage.saveLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'success_2',
          validated: true,
        })
      );
    });
  });
});
