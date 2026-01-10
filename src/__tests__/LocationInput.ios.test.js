// @flow

import React from 'react';
import renderer from 'react-test-renderer';
import { Platform, Geolocation } from 'react-native';
import LocationInput from '../components/LocationInput';
import LocationStorage from '../services/LocationStorage';

// Mock modules
jest.mock('react-native-google-places-autocomplete', () => ({
  GooglePlacesAutocomplete: ({ placeholder }) => (
    <MockGooglePlacesAutocomplete placeholder={placeholder} />
  ),
}));

jest.mock('../services/LocationStorage', () => ({
  getRecentLocations: jest.fn(),
  saveLocation: jest.fn(),
}));

jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    Platform: {
      ...actualRN.Platform,
      OS: 'ios',
    },
    Geolocation: {
      getCurrentPosition: jest.fn(),
    },
  };
});

// Mock component
const MockGooglePlacesAutocomplete = () => null;

describe('LocationInput - iOS Platform Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationStorage.getRecentLocations.mockResolvedValue([]);
    LocationStorage.saveLocation.mockResolvedValue(undefined);
  });

  describe('iOS-specific GPS Detection', () => {
    it('should use iOS-specific GPS timeout (5000ms)', () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      Geolocation.getCurrentPosition.mockImplementation(
        (success, error, options) => {
          // Verify iOS timeout is 5000ms
          expect(options.timeout).toBe(5000);
          success(mockPosition);
        }
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      const callArgs = Geolocation.getCurrentPosition.mock.calls[0];
      expect(callArgs[2].timeout).toBe(5000);
    });

    it('should request high accuracy location on iOS', () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      Geolocation.getCurrentPosition.mockImplementation(
        (success, error, options) => {
          expect(options.enableHighAccuracy).toBe(true);
          success(mockPosition);
        }
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      const callArgs = Geolocation.getCurrentPosition.mock.calls[0];
      expect(callArgs[2].enableHighAccuracy).toBe(true);
    });

    it('should not cache iOS location (maximumAge: 0)', () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      Geolocation.getCurrentPosition.mockImplementation(
        (success, error, options) => {
          expect(options.maximumAge).toBe(0);
          success(mockPosition);
        }
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      const callArgs = Geolocation.getCurrentPosition.mock.calls[0];
      expect(callArgs[2].maximumAge).toBe(0);
    });
  });

  describe('iOS Component Rendering', () => {
    it('should render LocationInput on iOS without errors', () => {
      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      const tree = renderer.create(
        <LocationInput placeholder="Enter destination" />
      ).toJSON();

      expect(tree).toBeTruthy();
    });

    it('should render with iOS platform-specific styles', () => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      expect(instance).toBeTruthy();
      // iOS should render without platform-specific style errors
    });
  });

  describe('iOS Recent Locations', () => {
    it('should render recent locations list on iOS', (done) => {
      const mockLocations = [
        {
          id: '1',
          name: 'San Francisco',
          address: '123 Main St, San Francisco, CA',
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: Date.now(),
          validated: true,
          frequency: 5,
        },
        {
          id: '2',
          name: 'Los Angeles',
          address: '456 Oak Ave, Los Angeles, CA',
          latitude: 34.0522,
          longitude: -118.2437,
          timestamp: Date.now(),
          validated: true,
          frequency: 3,
        },
      ];

      LocationStorage.getRecentLocations.mockResolvedValueOnce(
        mockLocations
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      setImmediate(() => {
        expect(instance.state.recentLocations).toEqual(mockLocations);
        expect(instance.state.recentLocations.length).toBe(2);
        done();
      });
    });

    it('should handle recent location selection on iOS', (done) => {
      const onLocationSelect = jest.fn();
      const instance = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      ).getInstance();

      const recentLocation = {
        id: '1',
        name: 'San Francisco',
        address: '123 Main St, San Francisco, CA',
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
        validated: true,
        frequency: 5,
      };

      instance.handleRecentLocationSelected(recentLocation);

      setImmediate(() => {
        expect(instance.state.selectedLocation).toEqual(recentLocation);
        expect(onLocationSelect).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('iOS Offline Support', () => {
    it('should handle GPS failure gracefully on iOS', (done) => {
      const mockError = {
        code: 1,
        message: 'Location permission denied',
      };

      Geolocation.getCurrentPosition.mockImplementation(
        (success, error) => error(mockError)
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      setImmediate(() => {
        expect(instance.state.isOnline).toBe(false);
        expect(instance.state.hasError).toBe(true);
        done();
      });
    });

    it('should allow location submission on iOS when offline', (done) => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.setState({ isOnline: false });

      const location = {
        id: 'ios_offline_123',
        name: 'Offline Location',
        address: 'San Francisco, CA',
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
        validated: false,
      };

      instance.handleRecentLocationSelected(location);

      setImmediate(() => {
        expect(instance.state.selectedLocation).toEqual(location);
        done();
      });
    });
  });

  describe('iOS Validation', () => {
    it('should validate GPS location properly on iOS', (done) => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      Geolocation.getCurrentPosition.mockImplementation(
        (success) => success(mockPosition)
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      setImmediate(() => {
        expect(instance.state.selectedLocation).toBeTruthy();
        expect(instance.state.selectedLocation.validated).toBe(false);
        expect(instance.state.selectedLocation.latitude).toBe(37.7749);
        done();
      });
    });

    it('should handle autocomplete validation on iOS', (done) => {
      LocationStorage.saveLocation.mockResolvedValueOnce(undefined);
      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      const placeData = {
        description: 'San Francisco, CA',
        name: 'San Francisco',
      };

      const placeDetails = {
        formatted_address: '123 Market St, San Francisco, CA',
        geometry: {
          location: {
            lat: 37.7749,
            lng: -122.4194,
          },
        },
      };

      instance.handlePlaceSelected(placeData, placeDetails);

      setImmediate(() => {
        expect(instance.state.selectedLocation.validated).toBe(true);
        done();
      });
    });
  });

  describe('iOS Error Handling', () => {
    it('should display permission error on iOS', (done) => {
      const mockError = {
        code: 1,
        message: 'User denied Geolocation',
      };

      Geolocation.getCurrentPosition.mockImplementation(
        (success, error) => error(mockError)
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      setImmediate(() => {
        expect(instance.state.errorMessage).toContain('permission');
        expect(instance.state.hasError).toBe(true);
        done();
      });
    });

    it('should handle network errors gracefully on iOS', (done) => {
      LocationStorage.getRecentLocations.mockRejectedValueOnce(
        new Error('Network unreachable')
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      setImmediate(() => {
        expect(instance.state.isOnline).toBe(false);
        done();
      });
    });
  });

  describe('iOS Performance', () => {
    it('should load recent locations efficiently on iOS', (done) => {
      const largeLocationSet = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        name: `Location ${i}`,
        address: `Address ${i}`,
        latitude: 37.7749 + i * 0.01,
        longitude: -122.4194 + i * 0.01,
        timestamp: Date.now(),
        validated: true,
        frequency: i + 1,
      }));

      LocationStorage.getRecentLocations.mockResolvedValueOnce(
        largeLocationSet
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      setImmediate(() => {
        expect(instance.state.recentLocations.length).toBe(20);
        done();
      });
    });
  });
});
