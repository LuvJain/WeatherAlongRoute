// @flow

/**
 * iOS-specific LocationValidationService Integration Tests
 * Tests offline-to-online validation flow on iOS platform
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { NetInfo, AsyncStorage } from 'react-native';
import LocationValidationService from '../services/LocationValidationService';
import LocationStorage from '../services/LocationStorage';
import type { Location } from '../models/Location';

// Mock NetInfo for iOS
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

describe('LocationValidationService Integration Tests (iOS)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationValidationService.cleanup();
  });

  afterEach(() => {
    LocationValidationService.cleanup();
  });

  describe('iOS Platform Offline-to-Online Flow', () => {
    it('should handle online status detection on iOS', async () => {
      const { NetInfo } = require('react-native');
      const statusCallback = jest.fn();

      NetInfo.isConnected.fetch.mockResolvedValueOnce(true);

      LocationValidationService.initialize();
      LocationValidationService.subscribeToOnlineStatus(statusCallback);

      // Simulate connectivity change on iOS
      const listeners = NetInfo._eventListeners['change'] || [];
      if (listeners.length > 0) {
        listeners[0](true);
      }

      await new Promise((resolve) => setImmediate(resolve));

      expect(statusCallback).toHaveBeenCalledWith(true);
    });

    it('should validate pending GPS locations on iOS when coming online', async () => {
      const { NetInfo } = require('react-native');

      const gpsLocation: Location = {
        id: 'gps_ios_123',
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
          id: 'gps_ios_123',
        })
      );
    });

    it('should handle iOS Geolocation timeout gracefully', async () => {
      const { Geolocation } = require('react-native');
      const mockError = {
        code: 3, // Timeout
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
  });

  describe('iOS AsyncStorage Integration', () => {
    it('should persist validation state across iOS app restart', async () => {
      const { AsyncStorage } = require('react-native');

      const location: Location = {
        id: 'ios_persist_123',
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

      // Verify location was saved to persistent storage
      expect(LocationStorage.saveLocation).toHaveBeenCalled();
    });
  });

  describe('iOS Memory Management', () => {
    it('should cleanup listeners when service is destroyed', () => {
      const { NetInfo } = require('react-native');

      LocationValidationService.initialize();
      LocationValidationService.cleanup();

      expect(NetInfo.isConnected.removeEventListener).toHaveBeenCalled();
    });

    it('should handle multiple service instances on iOS', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      LocationValidationService.initialize();

      const unsubscribe1 =
        LocationValidationService.subscribeToOnlineStatus(callback1);
      const unsubscribe2 =
        LocationValidationService.subscribeToOnlineStatus(callback2);

      unsubscribe1();
      unsubscribe2();

      LocationValidationService.cleanup();

      expect(LocationValidationService.onlineStatusCallbacks.length).toBe(0);
    });
  });

  describe('iOS Reverse Geocoding', () => {
    it('should reverse geocode GPS coordinates on iOS', async () => {
      const location: Location = {
        id: 'gps_reverse_ios',
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

    it('should handle reverse geocoding failures gracefully on iOS', async () => {
      const location: Location = {
        id: 'gps_fail_ios',
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

      global.fetch.mockRejectedValueOnce(new Error('Network failure'));

      LocationValidationService.initialize();

      // Should not throw
      await LocationValidationService.validatePendingLocations();

      expect(LocationValidationService.getOnlineStatus()).toBe(true);
    });
  });

  describe('iOS Battery and Performance', () => {
    it('should respect periodic validation interval on iOS', async () => {
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

    it('should not validate when offline on iOS', async () => {
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
  });
});
