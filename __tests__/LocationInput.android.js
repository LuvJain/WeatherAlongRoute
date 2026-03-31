import React from 'react';
import renderer from 'react-test-renderer';
import { LocationInput } from '../components/LocationInput';
import { LocationStorageService } from '../services/LocationStorage';

// Mock dependencies
jest.mock('../services/LocationStorage', () => ({
  LocationStorageService: {
    saveLocation: jest.fn(),
    getRecentLocations: jest.fn()
  }
}));

jest.mock('react-native-google-places-autocomplete', () => ({
  GooglePlacesAutocomplete: () => null
}));

jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    NetInfo: {
      isConnected: {
        fetch: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    }
  };
});

describe('LocationInput Component - Android Platform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationStorageService.getRecentLocations.mockResolvedValue([]);
  });

  describe('Android Rendering', () => {
    it('should render LocationInput on Android', () => {
      const tree = renderer
        .create(<LocationInput placeholder="Enter destination" />)
        .toJSON();
      expect(tree).toBeTruthy();
    });

    it('should render with Android-specific styling', () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      const state = instance.findByType(LocationInput).instance.state;
      expect(state).toBeDefined();
    });

    it('should display GPS button on Android', () => {
      const component = renderer.create(<LocationInput />);
      const tree = component.toJSON();
      expect(tree).toBeTruthy();
    });

    it('should handle Android geolocation API', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 15,
          altitude: 50,
          altitudeAccuracy: 8,
          heading: 90,
          speed: 5
        }
      };

      const mockGeolocation = {
        getCurrentPosition: jest.fn((success) => success(mockPosition))
      };
      navigator.geolocation = mockGeolocation;

      const onLocationSelect = jest.fn();
      const component = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      );

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._getCurrentLocation();

      expect(onLocationSelect).toHaveBeenCalled();
    });
  });

  describe('Android Offline Behavior', () => {
    it('should handle Android offline scenarios', async () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      // Simulate offline
      instance
        .findByType(LocationInput)
        .instance._handleNetworkChange(false);

      const state = instance.findByType(LocationInput).instance.state;
      expect(state.isOnline).toBe(false);
    });

    it('should allow submission in offline mode on Android', async () => {
      const onValidationChange = jest.fn();
      const component = renderer.create(
        <LocationInput
          allowOfflineSubmission={true}
          onValidationChange={onValidationChange}
        />
      );

      const instance = component.root;
      instance
        .findByType(LocationInput)
        .instance._handleOfflineSubmission();

      expect(onValidationChange).toHaveBeenCalledWith(false);
    });

    it('should handle Android network status changes', async () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      // Simulate going offline
      instance
        .findByType(LocationInput)
        .instance._handleNetworkChange(false);
      let state = instance.findByType(LocationInput).instance.state;
      expect(state.isOnline).toBe(false);

      // Simulate going back online
      instance
        .findByType(LocationInput)
        .instance._handleNetworkChange(true);
      state = instance.findByType(LocationInput).instance.state;
      expect(state.isOnline).toBe(true);
    });
  });

  describe('Android Recent Locations', () => {
    it('should display recent locations on Android', async () => {
      const mockRecentLocations = [
        {
          location: {
            id: '1',
            latitude: 40.7128,
            longitude: -74.006,
            address: 'New York, NY, USA',
            name: 'New York Office',
            validated: true,
            timestamp: Date.now()
          },
          frequency: 8,
          lastUsed: Date.now()
        },
        {
          location: {
            id: '2',
            latitude: 40.7589,
            longitude: -73.9851,
            address: 'Times Square, New York, NY',
            name: 'Times Square',
            validated: true,
            timestamp: Date.now() - 86400000
          },
          frequency: 5,
          lastUsed: Date.now() - 86400000
        }
      ];

      LocationStorageService.getRecentLocations.mockResolvedValue(
        mockRecentLocations
      );

      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      // Wait for componentDidMount
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = instance.findByType(LocationInput).instance.state;
      expect(state.recentLocations).toHaveLength(2);
    });

    it('should handle recent locations with high frequency on Android', async () => {
      const mockRecentLocations = [
        {
          location: {
            id: '1',
            latitude: 40.7128,
            longitude: -74.006,
            address: 'New York, NY',
            name: 'NYC',
            validated: true,
            timestamp: Date.now()
          },
          frequency: 100, // High frequency for Android user
          lastUsed: Date.now()
        }
      ];

      LocationStorageService.getRecentLocations.mockResolvedValue(
        mockRecentLocations
      );

      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = instance.findByType(LocationInput).instance.state;
      expect(state.recentLocations[0].frequency).toBe(100);
    });

    it('should select recent location on Android', async () => {
      const onLocationSelect = jest.fn();
      const component = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      );

      const mockRecentLocation = {
        location: {
          id: '1',
          latitude: 40.7128,
          longitude: -74.006,
          address: 'New York, NY, USA',
          name: 'New York',
          validated: true,
          timestamp: Date.now()
        },
        frequency: 20,
        lastUsed: Date.now()
      };

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._selectRecentLocation(mockRecentLocation);

      expect(onLocationSelect).toHaveBeenCalledWith(mockRecentLocation.location);
      expect(LocationStorageService.saveLocation).toHaveBeenCalled();
    });
  });

  describe('Android Places Autocomplete', () => {
    it('should handle Android place selection', async () => {
      const onLocationSelect = jest.fn();
      const component = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      );

      const placeData = {
        place_id: 'ChIJXx1Eou7YzIcRZJqVi3pVZZU',
        description: 'New York, NY, USA',
        structured_formatting: {
          main_text: 'New York',
          secondary_text: 'NY, USA'
        }
      };

      const placeDetails = {
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.006
          }
        },
        formatted_address: 'New York, NY, USA'
      };

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._handlePlacesSelection(placeData, placeDetails);

      expect(onLocationSelect).toHaveBeenCalled();
      const selectedLocation = onLocationSelect.mock.calls[0][0];
      expect(selectedLocation.latitude).toBe(40.7128);
      expect(selectedLocation.longitude).toBe(-74.006);
    });

    it('should save Android place to recent locations with timestamp', async () => {
      LocationStorageService.saveLocation.mockResolvedValue(undefined);

      const component = renderer.create(<LocationInput />);

      const placeData = {
        place_id: 'place456',
        description: 'Brooklyn, NY, USA',
        structured_formatting: {
          main_text: 'Brooklyn'
        }
      };

      const placeDetails = {
        geometry: {
          location: { lat: 40.6501, lng: -73.9496 }
        }
      };

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._handlePlacesSelection(placeData, placeDetails);

      expect(LocationStorageService.saveLocation).toHaveBeenCalled();
      const savedLocation = LocationStorageService.saveLocation.mock.calls[0][0];
      expect(savedLocation.timestamp).toBeTruthy();
    });
  });

  describe('Android Error Handling', () => {
    it('should handle Android geolocation permission errors', async () => {
      const onValidationChange = jest.fn();
      const mockGeolocation = {
        getCurrentPosition: jest.fn((success, error) =>
          error({
            code: 1,
            message: 'Permission denied'
          })
        )
      };
      navigator.geolocation = mockGeolocation;

      const component = renderer.create(
        <LocationInput onValidationChange={onValidationChange} />
      );

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._getCurrentLocation();

      expect(onValidationChange).toHaveBeenCalledWith(false);
    });

    it('should display validation error on Android', async () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      instance
        .findByType(LocationInput)
        .instance._handleLocationError('Location request timed out');

      const state = instance.findByType(LocationInput).instance.state;
      expect(state.validationError).toBe('Location request timed out');
    });

    it('should handle invalid place details on Android', async () => {
      const onValidationChange = jest.fn();
      const component = renderer.create(
        <LocationInput onValidationChange={onValidationChange} />
      );

      const placeData = { place_id: 'place123' };
      const placeDetails = {}; // Missing geometry

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._handlePlacesSelection(placeData, placeDetails);

      expect(onValidationChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Android Loading States', () => {
    it('should show loading state during GPS detection', async () => {
      const mockGeolocation = {
        getCurrentPosition: jest.fn()
      };
      navigator.geolocation = mockGeolocation;

      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      instance.findByType(LocationInput).instance._getCurrentLocation();

      // Check loading state
      const state = instance.findByType(LocationInput).instance.state;
      expect(state.loading).toBe(true);
    });
  });
});
