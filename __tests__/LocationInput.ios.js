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

describe('LocationInput Component - iOS Platform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationStorageService.getRecentLocations.mockResolvedValue([]);
  });

  describe('iOS Rendering', () => {
    it('should render LocationInput on iOS', () => {
      const tree = renderer
        .create(<LocationInput placeholder="Enter destination" />)
        .toJSON();
      expect(tree).toBeTruthy();
    });

    it('should render with iOS-specific styling', () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      const state = instance.findByType(LocationInput).instance.state;
      expect(state).toBeDefined();
    });

    it('should display GPS button on iOS', () => {
      const component = renderer.create(<LocationInput />);
      const tree = component.toJSON();
      expect(tree).toBeTruthy();
    });

    it('should handle iOS geolocation API', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 100,
          altitudeAccuracy: 5,
          heading: 0,
          speed: 0
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

  describe('iOS Offline Behavior', () => {
    it('should handle iOS offline scenarios', async () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      // Simulate offline
      instance
        .findByType(LocationInput)
        .instance._handleNetworkChange(false);

      const state = instance.findByType(LocationInput).instance.state;
      expect(state.isOnline).toBe(false);
    });

    it('should allow submission in offline mode on iOS', async () => {
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
  });

  describe('iOS Recent Locations', () => {
    it('should display recent locations horizontally on iOS', async () => {
      const mockRecentLocations = [
        {
          location: {
            id: '1',
            latitude: 37.7749,
            longitude: -122.4194,
            address: '123 Main St, San Francisco, CA',
            name: 'Main Office',
            validated: true,
            timestamp: Date.now()
          },
          frequency: 3,
          lastUsed: Date.now()
        },
        {
          location: {
            id: '2',
            latitude: 37.3382,
            longitude: -121.8863,
            address: 'San Jose, CA',
            name: 'San Jose Office',
            validated: true,
            timestamp: Date.now() - 86400000
          },
          frequency: 2,
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

    it('should select recent location on iOS', async () => {
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
          name: 'San Francisco',
          validated: true,
          timestamp: Date.now()
        },
        frequency: 10,
        lastUsed: Date.now()
      };

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._selectRecentLocation(mockRecentLocation);

      expect(onLocationSelect).toHaveBeenCalled();
      expect(LocationStorageService.saveLocation).toHaveBeenCalled();
    });
  });

  describe('iOS Places Autocomplete', () => {
    it('should handle iOS place selection', async () => {
      const onLocationSelect = jest.fn();
      const component = renderer.create(
        <LocationInput onLocationSelect={onLocationSelect} />
      );

      const placeData = {
        place_id: 'ChIJIQBpAG2ahYAR_6128GltTXQ',
        description: 'San Francisco, CA, USA',
        structured_formatting: {
          main_text: 'San Francisco',
          secondary_text: 'CA, USA'
        }
      };

      const placeDetails = {
        geometry: {
          location: {
            lat: 37.7749,
            lng: -122.4194
          },
          viewport: {
            northeast: { lat: 37.929824, lng: -122.356979 },
            southwest: { lat: 37.608814, lng: -122.525094 }
          }
        },
        formatted_address: 'San Francisco, CA, USA'
      };

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._handlePlacesSelection(placeData, placeDetails);

      expect(onLocationSelect).toHaveBeenCalled();
      const selectedLocation = onLocationSelect.mock.calls[0][0];
      expect(selectedLocation.address).toBe(placeData.description);
    });

    it('should save iOS place to recent locations', async () => {
      LocationStorageService.saveLocation.mockResolvedValue(undefined);

      const component = renderer.create(<LocationInput />);

      const placeData = {
        place_id: 'place123',
        description: 'Cupertino, CA, USA',
        structured_formatting: {
          main_text: 'Cupertino'
        }
      };

      const placeDetails = {
        geometry: {
          location: { lat: 37.3382, lng: -122.0096 }
        }
      };

      const instance = component.root;
      await instance
        .findByType(LocationInput)
        .instance._handlePlacesSelection(placeData, placeDetails);

      expect(LocationStorageService.saveLocation).toHaveBeenCalled();
    });
  });

  describe('iOS Error Handling', () => {
    it('should handle iOS geolocation permission errors', async () => {
      const onValidationChange = jest.fn();
      const mockGeolocation = {
        getCurrentPosition: jest.fn((success, error) =>
          error({
            code: 1,
            message: 'User denied geolocation'
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

    it('should display validation error on iOS', async () => {
      const component = renderer.create(<LocationInput />);
      const instance = component.root;

      instance
        .findByType(LocationInput)
        .instance._handleLocationError('Geolocation timeout');

      const state = instance.findByType(LocationInput).instance.state;
      expect(state.validationError).toBe('Geolocation timeout');
    });
  });
});
