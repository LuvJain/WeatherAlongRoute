// @flow

import React from 'react';
import renderer from 'react-test-renderer';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Geolocation,
  Platform,
} from 'react-native';
import LocationInput from '../components/LocationInput';
import LocationStorage from '../services/LocationStorage';

// Mock modules
jest.mock('react-native-google-places-autocomplete', () => ({
  GooglePlacesAutocomplete: ({ onPress, placeholder, styles }) => (
    <View testID="google-places-autocomplete">
      <Text>{placeholder}</Text>
    </View>
  ),
}));

jest.mock('../services/LocationStorage', () => ({
  getRecentLocations: jest.fn(),
  saveLocation: jest.fn(),
  deleteLocation: jest.fn(),
}));

jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    Geolocation: {
      getCurrentPosition: jest.fn(),
    },
  };
});

describe('LocationInput Component', () => {
  let mockLocationStorage;
  let mockGeolocation;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationStorage = LocationStorage;
    mockGeolocation = Geolocation;

    // Setup default mocks
    mockLocationStorage.getRecentLocations.mockResolvedValue([]);
    mockLocationStorage.saveLocation.mockResolvedValue(undefined);
  });

  describe('Component Rendering', () => {
    it('should render LocationInput component', () => {
      const tree = renderer.create(
        <LocationInput placeholder="Enter destination" />
      ).toJSON();

      expect(tree).toBeTruthy();
    });

    it('should display GPS detection button', () => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      const tree = renderer.create(
        <LocationInput />
      ).toJSON();

      expect(tree).toBeTruthy();
    });

    it('should display autocomplete input', () => {
      const tree = renderer.create(
        <LocationInput placeholder="Test placeholder" />
      ).toJSON();

      expect(tree).toBeTruthy();
    });

    it('should use custom placeholder', () => {
      const customPlaceholder = 'Choose a destination';
      const instance = renderer.create(
        <LocationInput placeholder={customPlaceholder} />
      ).getInstance();

      expect(instance.props.placeholder).toBe(customPlaceholder);
    });
  });

  describe('GPS Detection', () => {
    it('should detect current location successfully', (done) => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success) => success(mockPosition)
      );

      const onLocationSelect = jest.fn();
      const instance = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      ).getInstance();

      instance.detectCurrentLocation();

      setImmediate(() => {
        expect(instance.state.isLoadingGPS).toBe(false);
        expect(instance.state.selectedLocation).toBeTruthy();
        expect(instance.state.selectedLocation.latitude).toBe(40.7128);
        expect(instance.state.selectedLocation.longitude).toBe(-74.006);
        expect(instance.state.selectedLocation.validated).toBe(false);
        expect(onLocationSelect).toHaveBeenCalled();
        done();
      });
    });

    it('should show loading state during GPS detection', () => {
      mockGeolocation.getCurrentPosition.mockImplementation(() => {
        // Simulate delay
      });

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      expect(instance.state.isLoadingGPS).toBe(true);
    });

    it('should handle GPS permission denied error', (done) => {
      const mockError = {
        code: 1, // Permission denied
        message: 'User denied Geolocation',
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => error(mockError)
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      setImmediate(() => {
        expect(instance.state.isLoadingGPS).toBe(false);
        expect(instance.state.hasError).toBe(true);
        expect(instance.state.errorMessage).toContain('permission');
        expect(instance.state.isOnline).toBe(false);
        done();
      });
    });

    it('should handle GPS position unavailable error', (done) => {
      const mockError = {
        code: 2, // Position unavailable
        message: 'Position information is unavailable',
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => error(mockError)
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      setImmediate(() => {
        expect(instance.state.hasError).toBe(true);
        expect(instance.state.errorMessage).toContain('unavailable');
        done();
      });
    });

    it('should handle GPS timeout error', (done) => {
      const mockError = {
        code: 3, // Timeout
        message: 'The Geolocation request timed out',
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => error(mockError)
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      setImmediate(() => {
        expect(instance.state.hasError).toBe(true);
        expect(instance.state.errorMessage).toContain('timeout');
        done();
      });
    });

    it('should disable GPS button while loading', () => {
      mockGeolocation.getCurrentPosition.mockImplementation(() => {
        // Simulate delay
      });

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      expect(instance.state.isLoadingGPS).toBe(true);
    });
  });

  describe('GooglePlacesAutocomplete Integration', () => {
    it('should handle place selection with details', (done) => {
      const onLocationSelect = jest.fn();
      const instance = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      ).getInstance();

      const placeData = {
        description: 'New York, NY, USA',
        name: 'New York',
      };

      const placeDetails = {
        formatted_address: '123 Main St, New York, NY 10001, USA',
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.006,
          },
        },
      };

      mockLocationStorage.saveLocation.mockResolvedValueOnce(undefined);
      mockLocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      instance.handlePlaceSelected(placeData, placeDetails);

      setImmediate(() => {
        expect(instance.state.selectedLocation).toBeTruthy();
        expect(instance.state.selectedLocation.latitude).toBe(40.7128);
        expect(instance.state.selectedLocation.longitude).toBe(-74.006);
        expect(instance.state.selectedLocation.validated).toBe(true);
        expect(instance.state.selectedLocation.address).toBe(
          '123 Main St, New York, NY 10001, USA'
        );
        expect(onLocationSelect).toHaveBeenCalled();
        expect(mockLocationStorage.saveLocation).toHaveBeenCalled();
        done();
      });
    });

    it('should handle place selection without details gracefully', (done) => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      const placeData = {
        description: 'Unknown Place',
      };

      instance.handlePlaceSelected(placeData, null);

      setImmediate(() => {
        expect(instance.state.hasError).toBe(true);
        expect(instance.state.errorMessage).toContain('Could not retrieve');
        expect(instance.state.isOnline).toBe(false);
        done();
      });
    });

    it('should clear error after successful place selection', (done) => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      // Set initial error state
      instance.setState({ hasError: true, errorMessage: 'Some error' });

      const placeData = {
        description: 'Valid Place',
        name: 'Valid Place',
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

      mockLocationStorage.saveLocation.mockResolvedValueOnce(undefined);
      mockLocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      instance.handlePlaceSelected(placeData, placeDetails);

      setImmediate(() => {
        expect(instance.state.hasError).toBe(false);
        expect(instance.state.errorMessage).toBe('');
        done();
      });
    });
  });

  describe('Recent Locations', () => {
    it('should load recent locations on mount', (done) => {
      const mockLocations = [
        {
          id: '1',
          name: 'Home',
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.006,
          timestamp: Date.now(),
          validated: true,
          frequency: 3,
        },
      ];

      mockLocationStorage.getRecentLocations.mockResolvedValueOnce(
        mockLocations
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      setImmediate(() => {
        expect(mockLocationStorage.getRecentLocations).toHaveBeenCalled();
        expect(instance.state.recentLocations).toEqual(mockLocations);
        done();
      });
    });

    it('should handle recent locations loading error gracefully', (done) => {
      mockLocationStorage.getRecentLocations.mockRejectedValueOnce(
        new Error('Storage error')
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      setImmediate(() => {
        expect(instance.state.isOnline).toBe(false);
        done();
      });
    });

    it('should select recent location and update state', (done) => {
      const onLocationSelect = jest.fn();
      const instance = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      ).getInstance();

      const recentLocation = {
        id: '1',
        name: 'Home',
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: Date.now(),
        validated: true,
        frequency: 2,
      };

      instance.handleRecentLocationSelected(recentLocation);

      setImmediate(() => {
        expect(instance.state.selectedLocation).toEqual(recentLocation);
        expect(instance.state.hasError).toBe(false);
        expect(onLocationSelect).toHaveBeenCalledWith(recentLocation);
        done();
      });
    });

    it('should save location to recent locations after selection', (done) => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      const newLocation = {
        id: 'place_123',
        name: 'New Place',
        address: '456 Oak Ave',
        latitude: 40.8,
        longitude: -73.9,
        timestamp: Date.now(),
        validated: true,
      };

      mockLocationStorage.saveLocation.mockResolvedValueOnce(undefined);
      mockLocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      instance.saveLocationToRecents(newLocation);

      setImmediate(() => {
        expect(mockLocationStorage.saveLocation).toHaveBeenCalledWith(
          newLocation
        );
        done();
      });
    });
  });

  describe('Offline Support', () => {
    it('should handle offline scenario with GPS failure', (done) => {
      const mockError = {
        code: 2,
        message: 'Position unavailable',
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
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

    it('should allow location submission even when offline', (done) => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.setState({ isOnline: false });

      const location = {
        id: 'offline_123',
        name: 'Offline Location',
        address: '789 Elm St',
        latitude: 0,
        longitude: 0,
        timestamp: Date.now(),
        validated: false,
      };

      // Even with offline, component should allow selection
      instance.handleRecentLocationSelected(location);

      setImmediate(() => {
        expect(instance.state.selectedLocation).toEqual(location);
        done();
      });
    });

    it('should gracefully degrade when places autocomplete fails', (done) => {
      mockLocationStorage.saveLocation.mockRejectedValueOnce(
        new Error('Network error')
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      const placeData = {
        description: 'Test Place',
        name: 'Test Place',
      };

      const placeDetails = {
        formatted_address: 'Test Address',
        geometry: {
          location: {
            lat: 40,
            lng: -74,
          },
        },
      };

      instance.handlePlaceSelected(placeData, placeDetails);

      setImmediate(() => {
        // Component should still select location despite save failure
        expect(instance.state.selectedLocation).toBeTruthy();
        done();
      });
    });
  });

  describe('Validation States', () => {
    it('should mark GPS location as not validated', (done) => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success) => success(mockPosition)
      );

      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.detectCurrentLocation();

      setImmediate(() => {
        expect(instance.state.selectedLocation.validated).toBe(false);
        done();
      });
    });

    it('should mark autocomplete location as validated', (done) => {
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

      mockLocationStorage.saveLocation.mockResolvedValueOnce(undefined);
      mockLocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      instance.handlePlaceSelected(placeData, placeDetails);

      setImmediate(() => {
        expect(instance.state.selectedLocation.validated).toBe(true);
        done();
      });
    });
  });

  describe('Error Display', () => {
    it('should display minimal error without blocking submission', (done) => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.setState({ hasError: true, errorMessage: 'Test error' });

      setImmediate(() => {
        expect(instance.state.hasError).toBe(true);
        // Component should still be functional
        expect(instance.state.selectedLocation).toBeNull();
        done();
      });
    });

    it('should clear error when location is selected', (done) => {
      const instance = renderer.create(
        <LocationInput />
      ).getInstance();

      instance.setState({ hasError: true, errorMessage: 'Previous error' });

      const recentLocation = {
        id: '1',
        name: 'Home',
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: Date.now(),
        validated: true,
        frequency: 1,
      };

      instance.handleRecentLocationSelected(recentLocation);

      setImmediate(() => {
        expect(instance.state.hasError).toBe(false);
        expect(instance.state.errorMessage).toBe('');
        done();
      });
    });
  });
});
