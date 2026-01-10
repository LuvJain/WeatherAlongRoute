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
      OS: 'android',
    },
    Geolocation: {
      getCurrentPosition: jest.fn(),
    },
  };
});

// Mock component
const MockGooglePlacesAutocomplete = () => null;

describe('LocationInput - Android Platform Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationStorage.getRecentLocations.mockResolvedValue([]);
    LocationStorage.saveLocation.mockResolvedValue(undefined);
  });

  describe('Android-specific GPS Detection', () => {
    it('should use Android-specific GPS timeout (10000ms)', () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      Geolocation.getCurrentPosition.mockImplementation(
        (success, error, options) => {
          // Verify Android timeout is 10000ms
          expect(options.timeout).toBe(10000);
          success(mockPosition);
        }
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      expect(Geolocation.getCurrentPosition).toHaveBeenCalled();
      const callArgs = Geolocation.getCurrentPosition.mock.calls[0];
      expect(callArgs[2].timeout).toBe(10000);
    });

    it('should request high accuracy location on Android', () => {
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

    it('should not cache Android location (maximumAge: 0)', () => {
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

  describe('Android Component Rendering', () => {
    it('should render LocationInput on Android without errors', () => {
      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      const tree = renderer.create(
        <LocationInput placeholder="Enter destination" />
      ).toJSON();

      expect(tree).toBeTruthy();
    });

    it('should render with Android platform-specific layout', () => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      expect(instance).toBeTruthy();
      // Android should render without platform-specific layout errors
    });
  });

  describe('Android Recent Locations', () => {
    it('should render recent locations list on Android', (done) => {
      const mockLocations = [
        {
          id: '1',
          name: 'Times Square',
          address: '123 Broadway, New York, NY',
          latitude: 40.758,
          longitude: -73.985,
          timestamp: Date.now(),
          validated: true,
          frequency: 7,
        },
        {
          id: '2',
          name: 'Central Park',
          address: '456 Central Park West, New York, NY',
          latitude: 40.785,
          longitude: -73.968,
          timestamp: Date.now(),
          validated: true,
          frequency: 4,
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

    it('should handle recent location selection on Android', (done) => {
      const onLocationSelect = jest.fn();
      const instance = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      ).getInstance();

      const recentLocation = {
        id: '1',
        name: 'Times Square',
        address: '123 Broadway, New York, NY',
        latitude: 40.758,
        longitude: -73.985,
        timestamp: Date.now(),
        validated: true,
        frequency: 7,
      };

      instance.handleRecentLocationSelected(recentLocation);

      setImmediate(() => {
        expect(instance.state.selectedLocation).toEqual(recentLocation);
        expect(onLocationSelect).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Android Offline Support', () => {
    it('should handle GPS failure gracefully on Android', (done) => {
      const mockError = {
        code: 2,
        message: 'Position unavailable',
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

    it('should allow location submission on Android when offline', (done) => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.setState({ isOnline: false });

      const location = {
        id: 'android_offline_123',
        name: 'Offline Location',
        address: 'New York, NY',
        latitude: 40.7128,
        longitude: -74.006,
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

  describe('Android Validation', () => {
    it('should validate GPS location properly on Android', (done) => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
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
        expect(instance.state.selectedLocation.latitude).toBe(40.7128);
        done();
      });
    });

    it('should handle autocomplete validation on Android', (done) => {
      LocationStorage.saveLocation.mockResolvedValueOnce(undefined);
      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      const placeData = {
        description: 'New York, NY',
        name: 'New York',
      };

      const placeDetails = {
        formatted_address: '123 Broadway, New York, NY',
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.006,
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

  describe('Android Error Handling', () => {
    it('should display permission error on Android', (done) => {
      const mockError = {
        code: 1,
        message: 'Permission denied',
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

    it('should handle network errors on Android', (done) => {
      LocationStorage.getRecentLocations.mockRejectedValueOnce(
        new Error('Network error')
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      setImmediate(() => {
        expect(instance.state.isOnline).toBe(false);
        done();
      });
    });

    it('should handle timeout errors on Android', (done) => {
      const mockError = {
        code: 3,
        message: 'Timeout',
      };

      Geolocation.getCurrentPosition.mockImplementation(
        (success, error) => error(mockError)
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      setImmediate(() => {
        expect(instance.state.errorMessage).toContain('timeout');
        done();
      });
    });
  });

  describe('Android Performance', () => {
    it('should load recent locations efficiently on Android', (done) => {
      const largeLocationSet = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        name: `Location ${i}`,
        address: `Address ${i}`,
        latitude: 40.7128 + i * 0.01,
        longitude: -74.006 + i * 0.01,
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

    it('should handle rapid location selections on Android', (done) => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      const locations = [
        {
          id: '1',
          name: 'Location 1',
          address: 'Address 1',
          latitude: 40.1,
          longitude: -74.1,
          timestamp: Date.now(),
          validated: true,
          frequency: 1,
        },
        {
          id: '2',
          name: 'Location 2',
          address: 'Address 2',
          latitude: 40.2,
          longitude: -74.2,
          timestamp: Date.now(),
          validated: true,
          frequency: 1,
        },
      ];

      // Simulate rapid selections
      instance.handleRecentLocationSelected(locations[0]);
      instance.handleRecentLocationSelected(locations[1]);

      setImmediate(() => {
        // Should have last selected location
        expect(instance.state.selectedLocation).toEqual(locations[1]);
        done();
      });
    });
  });

  describe('Android AsyncStorage Integration', () => {
    it('should persist locations to Android AsyncStorage', (done) => {
      LocationStorage.saveLocation.mockResolvedValueOnce(undefined);
      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      const location = {
        id: 'android_123',
        name: 'New Location',
        address: 'New Address',
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: Date.now(),
        validated: true,
      };

      instance.saveLocationToRecents(location);

      setImmediate(() => {
        expect(LocationStorage.saveLocation).toHaveBeenCalledWith(location);
        done();
      });
    });
  });
});
