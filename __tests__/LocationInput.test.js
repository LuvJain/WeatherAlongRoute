import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import LocationInput from '../src/components/LocationInput';
import LocationStorage from '../src/services/LocationStorage';
import { AsyncStorage } from 'react-native';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

jest.mock('../src/services/LocationStorage');

// Mock navigator.geolocation
global.navigator.geolocation = {
  getCurrentPosition: jest.fn()
};

// Mock fetch for online status check
global.fetch = jest.fn();

describe('LocationInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationStorage.getRecentLocations.mockResolvedValue([]);
    LocationStorage.saveLocation.mockResolvedValue({
      id: 'test_id',
      latitude: 40.7128,
      longitude: -74.0060,
      name: 'Test Location',
      address: '123 Test St',
      validated: true,
      frequency: 1,
      lastUsed: Date.now()
    });
  });

  describe('Rendering', () => {
    it('should render LocationInput component with GPS button', () => {
      const mockCallback = jest.fn();
      const tree = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
          placeholder="Enter location"
        />
      ).toJSON();

      expect(tree).toBeTruthy();
      // Should contain GPS button text
      const rendered = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      );
      expect(rendered.root.findByType(LocationInput)).toBeTruthy();
    });

    it('should render with default placeholder', () => {
      const mockCallback = jest.fn();
      const tree = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).toJSON();

      expect(tree).toBeTruthy();
    });
  });

  describe('GPS Detection', () => {
    it('should handle GPS location request', () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      // Mock successful geolocation
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      global.fetch.mockResolvedValueOnce({ ok: true });
      navigator.geolocation.getCurrentPosition.mockImplementation(
        (successCallback) => {
          successCallback(mockPosition);
        }
      );

      instance.handleGetCurrentLocation();

      expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('should set gpsLoading state while fetching location', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      };

      global.fetch.mockResolvedValueOnce({ ok: true });
      navigator.geolocation.getCurrentPosition.mockImplementation(
        (successCallback) => {
          successCallback(mockPosition);
        }
      );

      instance.handleGetCurrentLocation();

      // Should have loading state initially
      expect(instance.state.gpsLoading).toBe(true);
    });

    it('should handle GPS error gracefully', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      const mockError = new Error('Geolocation error');
      navigator.geolocation.getCurrentPosition.mockImplementation(
        (successCallback, errorCallback) => {
          errorCallback(mockError);
        }
      );

      instance.handleGetCurrentLocation();

      expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
    });
  });

  describe('GooglePlaces Autocomplete', () => {
    it('should handle place selection from autocomplete', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      const mockData = {
        place_id: 'test_place_id',
        main_text: 'New York',
        description: '123 Main St, New York, NY'
      };

      const mockDetails = {
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        }
      };

      await instance.handlePlacesSelected(mockData, mockDetails);

      expect(LocationStorage.saveLocation).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New York',
          address: '123 Main St, New York, NY'
        })
      );
    });

    it('should set validated based on online status', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      instance.setState({ isOnline: false });

      const mockData = {
        place_id: 'test_place_id',
        main_text: 'New York',
        description: '123 Main St, New York, NY'
      };

      const mockDetails = {
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        }
      };

      await instance.handlePlacesSelected(mockData, mockDetails);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          validated: false
        })
      );
    });

    it('should handle autocomplete selection error', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      LocationStorage.saveLocation.mockRejectedValueOnce(
        new Error('Save error')
      );

      const mockData = {
        place_id: 'test_place_id',
        description: '123 Main St'
      };

      await instance.handlePlacesSelected(mockData, null);

      expect(instance.state.validationError).toBeTruthy();
    });
  });

  describe('Recent Locations', () => {
    it('should load and display recent locations', async () => {
      const mockRecentLocations = [
        {
          id: 'loc_1',
          latitude: 40.7128,
          longitude: -74.0060,
          name: 'New York',
          address: '123 Main St',
          validated: true,
          frequency: 3,
          lastUsed: Date.now()
        }
      ];

      LocationStorage.getRecentLocations.mockResolvedValueOnce(
        mockRecentLocations
      );

      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      await instance.loadRecentLocations();

      expect(instance.state.recentLocations).toEqual(mockRecentLocations);
    });

    it('should handle recent location selection', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      const recentLocation = {
        id: 'loc_1',
        latitude: 40.7128,
        longitude: -74.0060,
        name: 'New York',
        address: '123 Main St',
        validated: true,
        frequency: 1,
        lastUsed: Date.now()
      };

      await instance.handleRecentLocationSelected(recentLocation);

      expect(instance.state.selectedLocation).toEqual(recentLocation);
      expect(LocationStorage.saveLocation).toHaveBeenCalledWith(recentLocation);
      expect(mockCallback).toHaveBeenCalledWith(recentLocation);
    });

    it('should display empty state when no recent locations', async () => {
      LocationStorage.getRecentLocations.mockResolvedValueOnce([]);

      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      await instance.loadRecentLocations();

      expect(instance.state.recentLocations).toEqual([]);
    });

    it('should handle error loading recent locations', async () => {
      LocationStorage.getRecentLocations.mockRejectedValueOnce(
        new Error('Storage error')
      );

      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      await instance.loadRecentLocations();

      expect(instance.state.recentLocations).toEqual([]);
    });
  });

  describe('Offline Scenarios', () => {
    it('should set validated to false when offline', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      // Mock offline status
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      instance.setState({ isOnline: false });

      const mockData = {
        place_id: 'test_place_id',
        main_text: 'New York',
        description: '123 Main St'
      };

      const mockDetails = {
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        }
      };

      await instance.handlePlacesSelected(mockData, mockDetails);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          validated: false
        })
      );
    });

    it('should allow submission with validated false in offline mode', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      instance.setState({ isOnline: false });

      const mockData = {
        place_id: 'test_place_id',
        description: '123 Main St'
      };

      const mockDetails = {
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        }
      };

      await instance.handlePlacesSelected(mockData, mockDetails);

      // Callback should still be called even with validated: false
      expect(mockCallback).toHaveBeenCalled();
      const callArgs = mockCallback.mock.calls[0][0];
      expect(callArgs.validated).toBe(false);
    });

    it('should display offline warning message', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      instance.setState({ isOnline: false });

      const errorElement = instance.renderValidationError();
      expect(errorElement).toBeTruthy();
    });

    it('should not block submission in offline mode', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      instance.setState({ isOnline: false });

      const mockData = {
        place_id: 'test_place_id',
        description: '123 Main St'
      };

      const mockDetails = {
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        }
      };

      await instance.handlePlacesSelected(mockData, mockDetails);

      // Should still call the callback (not blocked)
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('Validation Error Display', () => {
    it('should display minimal error message', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      instance.setState({
        validationError: 'Test error message'
      });

      const errorElement = instance.renderValidationError();
      expect(errorElement).toBeTruthy();
    });

    it('should not block user submission when validation error exists', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      instance.setState({
        validationError: 'Some validation issue'
      });

      const mockData = {
        place_id: 'test_place_id',
        description: '123 Main St'
      };

      const mockDetails = {
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        }
      };

      await instance.handlePlacesSelected(mockData, mockDetails);

      // Should still be able to select location
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should clear validation error on successful selection', async () => {
      const mockCallback = jest.fn();
      const instance = renderer.create(
        <LocationInput
          onLocationSelected={mockCallback}
          googlePlacesApiKey="test_api_key"
        />
      ).getInstance();

      instance.setState({
        validationError: 'Previous error'
      });

      const mockData = {
        place_id: 'test_place_id',
        description: '123 Main St'
      };

      const mockDetails = {
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        }
      };

      await instance.handlePlacesSelected(mockData, mockDetails);

      expect(instance.state.validationError).toBeNull();
    });
  });
});
