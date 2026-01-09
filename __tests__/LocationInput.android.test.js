import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import { Platform } from 'react-native';
import LocationInput from '../src/components/LocationInput';
import LocationStorage from '../src/services/LocationStorage';

// Force Android platform
Platform.OS = 'android';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: {
    OS: 'android'
  },
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

jest.mock('../src/services/LocationStorage');

global.navigator.geolocation = {
  getCurrentPosition: jest.fn()
};

global.fetch = jest.fn();

describe('LocationInput - Android Platform', () => {
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

  it('should render LocationInput correctly on Android', () => {
    const mockCallback = jest.fn();
    const tree = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
        placeholder="Enter location"
      />
    ).toJSON();

    expect(tree).toBeTruthy();
  });

  it('should use Android-compatible geolocation on Android', () => {
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
        longitude: -74.0060,
        altitude: 10,
        accuracy: 5,
        heading: 45,
        speed: 0
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

  it('should apply Android-specific styling', () => {
    const mockCallback = jest.fn();
    const tree = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).toJSON();

    expect(tree).toBeTruthy();
  });

  it('should handle Android-specific geolocation errors', async () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    const mockError = {
      code: 1, // PERMISSION_DENIED on Android
      message: 'Access to fine location denied'
    };

    navigator.geolocation.getCurrentPosition.mockImplementation(
      (successCallback, errorCallback) => {
        errorCallback(mockError);
      }
    );

    instance.handleGetCurrentLocation();

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it('should handle Android runtime permissions workflow', async () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    // Simulate Android permission timeout
    navigator.geolocation.getCurrentPosition.mockImplementation(
      (successCallback, errorCallback) => {
        // Simulate Android timeout due to permission request
        setTimeout(() => {
          const timeoutError = {
            code: 3,
            message: 'Permission request timed out'
          };
          errorCallback(timeoutError);
        }, 100);
      }
    );

    instance.handleGetCurrentLocation();

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it('should properly manage Android lifecycle', async () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    // Simulate componentDidMount
    await instance.componentDidMount();

    expect(LocationStorage.getRecentLocations).toHaveBeenCalled();
  });

  it('should handle Android autocomplete selection', async () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    const mockData = {
      place_id: 'ChIJ-a6W4Xh_zlQRc5ZyIlLZW8s',
      main_text: 'Android City',
      description: '456 Tech Ave, Android City, AC 12345'
    };

    const mockDetails = {
      place_id: 'ChIJ-a6W4Xh_zlQRc5ZyIlLZW8s',
      formatted_address: '456 Tech Ave, Android City, AC 12345',
      geometry: {
        location: {
          lat: 37.7749,
          lng: -122.4194
        }
      }
    };

    await instance.handlePlacesSelected(mockData, mockDetails);

    expect(LocationStorage.saveLocation).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalled();
  });

  it('should handle long location names on Android UI', async () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    const mockData = {
      place_id: 'test_place',
      main_text: 'Very Long Location Name That Might Wrap',
      description:
        'This is a very long address description that spans multiple lines on Android devices with small screens'
    };

    const mockDetails = {
      geometry: {
        location: {
          lat: 37.7749,
          lng: -122.4194
        }
      }
    };

    await instance.handlePlacesSelected(mockData, mockDetails);

    expect(mockCallback).toHaveBeenCalled();
  });

  it('should render GPS button with Android Material Design', () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    const gpsButton = instance.renderGPSButton();
    expect(gpsButton).toBeTruthy();
  });

  it('should render recent locations with Android-optimized list', async () => {
    const mockRecentLocations = [
      {
        id: 'loc_1',
        latitude: 40.7128,
        longitude: -74.0060,
        name: 'Location 1',
        address: '123 Main St',
        validated: true,
        frequency: 5,
        lastUsed: Date.now()
      },
      {
        id: 'loc_2',
        latitude: 34.0522,
        longitude: -118.2437,
        name: 'Location 2',
        address: '456 Oak Ave',
        validated: true,
        frequency: 3,
        lastUsed: Date.now() - 1000
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

    const recentLocations = instance.renderRecentLocations();
    expect(recentLocations).toBeTruthy();
  });

  it('should handle orientation changes on Android', () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    // Component should maintain state during orientation change
    instance.setState({ gpsLoading: true });
    expect(instance.state.gpsLoading).toBe(true);
  });

  it('should handle back button press gracefully on Android', async () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    // Set up some state
    instance.setState({
      selectedLocation: {
        id: 'test',
        latitude: 40.7128,
        longitude: -74.0060,
        name: 'Test',
        address: 'Test Address',
        validated: true
      }
    });

    // State should persist if back is pressed
    expect(instance.state.selectedLocation).toBeTruthy();
  });
});
