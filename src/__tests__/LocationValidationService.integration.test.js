// @flow

import React from 'react';
import renderer from 'react-test-renderer';
import { NetInfo, AsyncStorage } from 'react-native';
import LocationValidationService from '../services/LocationValidationService';
import LocationStorage from '../services/LocationStorage';
import LocationInput from '../components/LocationInput';
import type { Location, RecentLocation } from '../models/Location';

// Mock NetInfo for connectivity changes
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

// Mock global fetch for reverse geocoding API
global.fetch = jest.fn();

describe('LocationValidationService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationValidationService.cleanup();
  });

  afterEach(() => {
    LocationValidationService.cleanup();
  });

  describe('Offline-to-Online Transition', () => {
    it('should detect online status transition', async () => {
      const { NetInfo } = require('react-native');
      const onlineStatusCallback = jest.fn();

      // Start as offline
      NetInfo.isConnected.fetch.mockResolvedValueOnce(false);

      LocationValidationService.initialize();
      LocationValidationService.subscribeToOnlineStatus(onlineStatusCallback);

      // Simulate transition to online
      const listeners = NetInfo._eventListeners['change'] || [];
      if (listeners.length > 0) {
        listeners[0](true);
      }

      await new Promise((resolve) => setImmediate(resolve));

      expect(onlineStatusCallback).toHaveBeenCalledWith(true);
    });

    it('should validate pending locations when transitioning to online', async () => {
      const { NetInfo } = require('react-native');

      // Mock pending location
      const pendingLocation: Location = {
        id: 'gps_123',
        name: 'Current Location',
        address: '40.7128, -74.006',
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: Date.now(),
        validated: false,
      };

      const mockGeocodedAddress =
        '123 Main St, New York, NY 10001, USA';

      // Setup mocks
      NetInfo.isConnected.fetch.mockResolvedValueOnce(false);
      LocationStorage.getRecentLocations.mockResolvedValueOnce([
        pendingLocation,
      ]);

      global.fetch.mockResolvedValueOnce({
        json: async () => ({
          results: [
            {
              formatted_address: mockGeocodedAddress,
            },
          ],
        }),
      });

      LocationValidationService.initialize();

      // Simulate transition from offline to online
      const listeners = NetInfo._eventListeners['change'] || [];
      if (listeners.length > 0) {
        listeners[0](true);
      }

      // Wait for async validation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify reverse geocoding was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('geocode')
      );

      // Verify location was updated with validated: true
      expect(LocationStorage.saveLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          validated: true,
          address: mockGeocodedAddress,
        })
      );
    });

    it('should handle validation failures gracefully', async () => {
      const { NetInfo } = require('react-native');

      const pendingLocation: Location = {
        id: 'gps_456',
        name: 'Location',
        address: '0, 0',
        latitude: 0,
        longitude: 0,
        timestamp: Date.now(),
        validated: false,
      };

      NetInfo.isConnected.fetch.mockResolvedValueOnce(false);
      LocationStorage.getRecentLocations.mockResolvedValueOnce([
        pendingLocation,
      ]);

      // Mock API error
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      LocationValidationService.initialize();

      const listeners = NetInfo._eventListeners['change'] || [];
      if (listeners.length > 0) {
        listeners[0](true);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Service should not throw despite error
      expect(LocationValidationService.getOnlineStatus()).toBe(true);
    });
  });

  describe('Location Validation Updates', () => {
    it('should notify listeners when location is validated', async () => {
      const locationUpdateCallback = jest.fn();

      const pendingLocation: Location = {
        id: 'gps_789',
        name: 'Test Location',
        address: '40, -74',
        latitude: 40,
        longitude: -74,
        timestamp: Date.now(),
        validated: false,
      };

      const mockGeocodedAddress = 'Test Address';

      LocationStorage.getRecentLocations.mockResolvedValueOnce([
        pendingLocation,
      ]);

      global.fetch.mockResolvedValueOnce({
        json: async () => ({
          results: [
            {
              formatted_address: mockGeocodedAddress,
            },
          ],
        }),
      });

      LocationValidationService.initialize();
      LocationValidationService.subscribeToLocationUpdates(
        locationUpdateCallback
      );

      await LocationValidationService.validatePendingLocations();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(locationUpdateCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          validated: true,
          id: pendingLocation.id,
        })
      );
    });

    it('should skip already validated locations', async () => {
      const validatedLocation: Location = {
        id: 'place_123',
        name: 'Validated Place',
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: Date.now(),
        validated: true,
      };

      LocationStorage.getRecentLocations.mockResolvedValueOnce([
        validatedLocation,
      ]);

      LocationValidationService.initialize();
      await LocationValidationService.validatePendingLocations();

      // Should not call fetch for already validated location
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Periodic Validation', () => {
    it('should periodically validate pending locations when online', async () => {
      const { NetInfo } = require('react-native');

      const pendingLocation: Location = {
        id: 'gps_periodic',
        name: 'Location',
        address: '40, -74',
        latitude: 40,
        longitude: -74,
        timestamp: Date.now(),
        validated: false,
      };

      NetInfo.isConnected.fetch.mockResolvedValueOnce(true);
      LocationStorage.getRecentLocations.mockResolvedValue([
        pendingLocation,
      ]);

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

      // Wait for first validation cycle
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(LocationStorage.getRecentLocations).toHaveBeenCalled();
    });
  });

  describe('LocationInput Integration', () => {
    it('should update validation status when location is validated', async () => {
      const { AsyncStorage, Geolocation } = require('react-native');

      const pendingLocation: Location = {
        id: 'gps_input',
        name: 'Current Location',
        address: '40, -74',
        latitude: 40,
        longitude: -74,
        timestamp: Date.now(),
        validated: false,
      };

      const validatedLocation: Location = {
        ...pendingLocation,
        validated: true,
        address: 'Validated Address',
      };

      LocationStorage.getRecentLocations.mockResolvedValue([
        validatedLocation,
      ]);
      LocationStorage.saveLocation.mockResolvedValue(undefined);

      const instance = renderer.create(
        <LocationInput placeholder="Test" />
      ).getInstance();

      await new Promise((resolve) => setImmediate(resolve));

      // Verify component loaded recent locations
      expect(LocationStorage.getRecentLocations).toHaveBeenCalled();
    });

    it('should render validation indicator for GPS detected location', (done) => {
      const { Geolocation } = require('react-native');

      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      Geolocation.getCurrentPosition.mockImplementation(
        (success) => success(mockPosition)
      );

      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);
      LocationStorage.saveLocation.mockResolvedValueOnce(undefined);

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      setImmediate(() => {
        // GPS location should be marked as not validated initially
        expect(instance.state.selectedLocation.validated).toBe(false);

        // Validation service would later validate this
        done();
      });
    });

    it('should render validation indicator for autocomplete location', (done) => {
      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);
      LocationStorage.saveLocation.mockResolvedValueOnce(undefined);

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      const placeData = {
        description: 'Validated Place',
        name: 'Validated Place',
      };

      const placeDetails = {
        formatted_address: 'Valid Address',
        geometry: {
          location: {
            lat: 40,
            lng: -74,
          },
        },
      };

      instance.handlePlaceSelected(placeData, placeDetails);

      setImmediate(() => {
        // Autocomplete location should be immediately validated
        expect(instance.state.selectedLocation.validated).toBe(true);
        done();
      });
    });
  });

  describe('Recent Locations Persistence', () => {
    it('should persist recent locations across sessions', async () => {
      const mockLocations: RecentLocation[] = [
        {
          id: '1',
          name: 'Home',
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.006,
          timestamp: Date.now(),
          validated: true,
          frequency: 5,
        },
        {
          id: '2',
          name: 'Work',
          address: '456 Oak Ave',
          latitude: 40.758,
          longitude: -73.985,
          timestamp: Date.now(),
          validated: true,
          frequency: 3,
        },
      ];

      LocationStorage.getRecentLocations.mockResolvedValueOnce(
        mockLocations
      );
      LocationStorage.saveLocation.mockResolvedValueOnce(undefined);

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      await new Promise((resolve) => setImmediate(resolve));

      // Verify recent locations were loaded
      expect(instance.state.recentLocations.length).toBe(2);
    });

    it('should track location frequency', async () => {
      const location: Location = {
        id: '1',
        name: 'Frequent Location',
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: Date.now(),
        validated: true,
      };

      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);
      LocationStorage.saveLocation.mockResolvedValueOnce(undefined);

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      await instance.saveLocationToRecents(location);

      // Verify location was saved
      expect(LocationStorage.saveLocation).toHaveBeenCalledWith(location);
    });
  });

  describe('Error Handling', () => {
    it('should handle reverse geocoding API errors gracefully', async () => {
      const pendingLocation: Location = {
        id: 'gps_error',
        name: 'Location',
        address: '40, -74',
        latitude: 40,
        longitude: -74,
        timestamp: Date.now(),
        validated: false,
      };

      LocationStorage.getRecentLocations.mockResolvedValueOnce([
        pendingLocation,
      ]);

      global.fetch.mockResolvedValueOnce({
        json: async () => ({
          error_message: 'Invalid request',
          results: [],
        }),
      });

      LocationValidationService.initialize();

      // Should not throw when API returns error
      await LocationValidationService.validatePendingLocations();

      // Service should still be operational
      expect(LocationValidationService.getOnlineStatus()).toBe(true);
    });

    it('should not block app when storage fails', async () => {
      LocationStorage.getRecentLocations.mockRejectedValueOnce(
        new Error('Storage error')
      );

      LocationValidationService.initialize();

      // Should not throw
      await LocationValidationService.validatePendingLocations();

      expect(LocationValidationService.getOnlineStatus()).toBe(true);
    });

    it('should handle multiple simultaneous validations', async () => {
      const locations: Location[] = [
        {
          id: 'gps_1',
          name: 'Location 1',
          address: '40, -74',
          latitude: 40,
          longitude: -74,
          timestamp: Date.now(),
          validated: false,
        },
        {
          id: 'gps_2',
          name: 'Location 2',
          address: '41, -75',
          latitude: 41,
          longitude: -75,
          timestamp: Date.now(),
          validated: false,
        },
        {
          id: 'gps_3',
          name: 'Location 3',
          address: '42, -76',
          latitude: 42,
          longitude: -76,
          timestamp: Date.now(),
          validated: false,
        },
      ];

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

      // All locations should be validated
      expect(LocationStorage.saveLocation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cleanup and Lifecycle', () => {
    it('should cleanup resources on unmount', () => {
      const { NetInfo } = require('react-native');

      LocationValidationService.initialize();
      LocationValidationService.cleanup();

      // Verify event listeners were removed
      expect(NetInfo.isConnected.removeEventListener).toHaveBeenCalled();
    });

    it('should clear subscriptions on cleanup', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      LocationValidationService.initialize();
      const unsubscribe1 = LocationValidationService.subscribeToOnlineStatus(
        callback1
      );
      const unsubscribe2 = LocationValidationService.subscribeToOnlineStatus(
        callback2
      );

      LocationValidationService.cleanup();

      // Callbacks should be cleared
      expect(LocationValidationService.onlineStatusCallbacks.length).toBe(0);
    });
  });
});
