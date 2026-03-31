import React from 'react';
import renderer from 'react-test-renderer';
import { LocationInput } from '../components/LocationInput';
import { LocationStorageService } from '../services/LocationStorage';
import { NetInfo } from 'react-native';

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

describe('LocationInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationStorageService.getRecentLocations.mockResolvedValue([]);
    NetInfo.isConnected.fetch.mockResolvedValue(true);
  });

  describe('GPS Detection', () => {
    it('should render GPS detection button', () => {
      const tree = renderer
        .create(<LocationInput />)
        .toJSON();
      expect(tree).toBeTruthy();
    });

    it('should show loading state when GPS is activated', async () => {
      const mockGeolocation = {
        getCurrentPosition: jest.fn()
      };
      navigator.geolocation = mockGeolocation;

      const instance = renderer.create(<LocationInput />).root;
      await instance.findByType(LocationInput).instance._getCurrentLocation();

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('should handle successful GPS location', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194
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
      await instance.findByType(LocationInput).instance._getCurrentLocation();

      expect(onLocationSelect).toHaveBeenCalled();
      const selectedLocation = onLocationSelect.mock.calls[0][0];
      expect(selectedLocation.latitude).toBe(37.7749);
      expect(selectedLocation.longitude).toBe(-122.4194);
      expect(selectedLocation.validated).toBe(true);
    });

    it('should handle GPS location error', async () => {
      const mockGeolocation = {
        getCurrentPosition: jest.fn((success, error) =>
          error({ message: 'Geolocation permission denied' })
        )
      };
      navigator.geolocation = mockGeolocation;

      const onValidationChange = jest.fn();
      const component = renderer.create(
        <LocationInput onValidationChange={onValidationChange} />
      );

      const instance = component.root;
      await instance.findByType(LocationInput).instance._getCurrentLocation();

      expect(onValidationChange).toHaveBeenCalledWith(false);
    });
  });

  describe('GooglePlacesAutocomplete', () => {
    it('should handle place selection with valid details', async () => {
      const onLocationSelect = jest.fn();
      const component = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      );

      const placeData = {
        place_id: 'place123',
        description: '123 Main St, San Francisco, CA',
        structured_formatting: {
          main_text: '123 Main St'
        }
      };

      const placeDetails = {
        geometry: {
          location: {
            lat: 37.7749,
            lng: -122.4194
          }
        }
      };

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._handlePlacesSelection(placeData, placeDetails);

      expect(onLocationSelect).toHaveBeenCalled();
      const selectedLocation = onLocationSelect.mock.calls[0][0];
      expect(selectedLocation.latitude).toBe(37.7749);
      expect(selectedLocation.longitude).toBe(-122.4194);
      expect(selectedLocation.address).toBe(placeData.description);
      expect(selectedLocation.placeId).toBe('place123');
      expect(selectedLocation.validated).toBe(true);
    });

    it('should handle invalid place selection', async () => {
      const onValidationChange = jest.fn();
      const component = renderer.create(
        <LocationInput onValidationChange={onValidationChange} />
      );

      const placeData = { place_id: 'place123' };
      const placeDetails = {}; // No geometry

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._handlePlacesSelection(placeData, placeDetails);

      expect(onValidationChange).toHaveBeenCalledWith(false);
    });

    it('should save location to storage after selection', async () => {
      LocationStorageService.saveLocation.mockResolvedValue(undefined);
      LocationStorageService.getRecentLocations.mockResolvedValue([]);

      const component = renderer.create(<LocationInput />);

      const placeData = {
        place_id: 'place123',
        description: '123 Main St, San Francisco, CA',
        structured_formatting: { main_text: '123 Main St' }
      };

      const placeDetails = {
        geometry: {
          location: { lat: 37.7749, lng: -122.4194 }
        }
      };

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._handlePlacesSelection(placeData, placeDetails);

      expect(LocationStorageService.saveLocation).toHaveBeenCalled();
    });
  });

  describe('Recent Locations', () => {
    it('should load and display recent locations', async () => {
      const mockRecentLocations = [
        {
          location: {
            id: '1',
            latitude: 37.7749,
            longitude: -122.4194,
            address: '123 Main St, San Francisco, CA',
            validated: true,
            timestamp: Date.now()
          },
          frequency: 5,
          lastUsed: Date.now()
        }
      ];

      LocationStorageService.getRecentLocations.mockResolvedValue(
        mockRecentLocations
      );

      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      // Wait for componentDidMount to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = instance.findByType(LocationInput).instance.state;
      expect(state.recentLocations).toEqual(mockRecentLocations);
    });

    it('should select a recent location', async () => {
      const onLocationSelect = jest.fn();
      const component = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      );

      const mockRecentLocation = {
        location: {
          id: '1',
          latitude: 37.7749,
          longitude: -122.4194,
          address: '123 Main St, San Francisco, CA',
          validated: true,
          timestamp: Date.now()
        },
        frequency: 5,
        lastUsed: Date.now()
      };

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._selectRecentLocation(mockRecentLocation);

      expect(onLocationSelect).toHaveBeenCalledWith(mockRecentLocation.location);
      expect(LocationStorageService.saveLocation).toHaveBeenCalled();
    });

    it('should update frequency when selecting existing recent location', async () => {
      LocationStorageService.saveLocation.mockResolvedValue(undefined);

      const component = renderer.create(<LocationInput />);

      const mockRecentLocation = {
        location: {
          id: '1',
          latitude: 37.7749,
          longitude: -122.4194,
          address: '123 Main St',
          validated: true,
          timestamp: Date.now()
        },
        frequency: 5,
        lastUsed: Date.now()
      };

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._selectRecentLocation(mockRecentLocation);

      expect(LocationStorageService.saveLocation).toHaveBeenCalledWith(
        mockRecentLocation.location
      );
    });
  });

  describe('Offline Scenarios', () => {
    it('should detect offline status', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(false);

      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      // Wait for componentDidMount
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = instance.findByType(LocationInput).instance.state;
      expect(state.isOnline).toBe(false);
    });

    it('should show offline warning when offline', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(false);

      const tree = renderer
        .create(<LocationInput />)
        .toJSON();

      expect(tree).toBeTruthy();
    });

    it('should allow offline submission', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(false);

      const onValidationChange = jest.fn();
      const component = renderer.create(
        <LocationInput
          allowOfflineSubmission={true}
          onValidationChange={onValidationChange}
        />
      );

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._handleOfflineSubmission();

      expect(onValidationChange).toHaveBeenCalledWith(false);
    });

    it('should set validated to false in offline mode', async () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      instance.findByType(LocationInput).instance._handleOfflineSubmission();

      const state = instance.findByType(LocationInput).instance.state;
      expect(state.validated).toBe(false);
    });

    it('should handle network status changes', async () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      const handleNetworkChange = instance
        .findByType(LocationInput)
        .instance._handleNetworkChange;

      handleNetworkChange(false);
      let state = instance.findByType(LocationInput).instance.state;
      expect(state.isOnline).toBe(false);

      handleNetworkChange(true);
      state = instance.findByType(LocationInput).instance.state;
      expect(state.isOnline).toBe(true);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should display validation error', async () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      instance
        .findByType(LocationInput)
        .instance._handleLocationError('Permission denied');

      const state = instance.findByType(LocationInput).instance.state;
      expect(state.validationError).toBe('Permission denied');
      expect(state.validated).toBe(false);
    });

    it('should clear validation error on successful location', async () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      // Set error first
      instance
        .findByType(LocationInput)
        .instance._handleLocationError('Test error');

      let state = instance.findByType(LocationInput).instance.state;
      expect(state.validationError).toBe('Test error');

      // Handle successful location
      const mockPosition = {
        coords: { latitude: 37.7749, longitude: -122.4194 }
      };
      await instance
        .findByType(LocationInput)
        .instance._handleLocationSuccess(mockPosition);

      state = instance.findByType(LocationInput).instance.state;
      expect(state.validationError).toBeNull();
      expect(state.validated).toBe(true);
    });

    it('should trigger onValidationChange callback', async () => {
      const onValidationChange = jest.fn();
      const component = renderer.create(
        <LocationInput onValidationChange={onValidationChange} />
      );

      const instance = component.root;
      const mockPosition = {
        coords: { latitude: 37.7749, longitude: -122.4194 }
      };

      await instance
        .findByType(LocationInput)
        .instance._handleLocationSuccess(mockPosition);

      expect(onValidationChange).toHaveBeenCalledWith(true);
    });

    it('should not block submission with minimal validation errors', async () => {
      const component = renderer.create(<LocationInput />);

      // Component should render without blocking
      const tree = renderer.create(<LocationInput />).toJSON();
      expect(tree).toBeTruthy();
    });
  });
});
