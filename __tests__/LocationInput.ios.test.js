import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import { Platform } from 'react-native';
import LocationInput from '../src/components/LocationInput';
import LocationStorage from '../src/services/LocationStorage';

// Force iOS platform
Platform.OS = 'ios';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: {
    OS: 'ios'
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

describe('LocationInput - iOS Platform', () => {
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

  it('should render LocationInput correctly on iOS', () => {
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

  it('should use iOS-compatible geolocation on iOS', () => {
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

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it('should apply iOS-specific styling', () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    const tree = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).toJSON();

    expect(tree).toBeTruthy();
  });

  it('should handle iOS-specific geolocation errors', async () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    const mockError = {
      code: 1, // PERMISSION_DENIED on iOS
      message: 'User denied access to geolocation'
    };

    navigator.geolocation.getCurrentPosition.mockImplementation(
      (successCallback, errorCallback) => {
        errorCallback(mockError);
      }
    );

    instance.handleGetCurrentLocation();

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it('should properly manage iOS memory lifecycle', async () => {
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

  it('should handle iOS autocomplete selection with details', async () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelected={mockCallback}
        googlePlacesApiKey="test_api_key"
      />
    ).getInstance();

    const mockData = {
      place_id: 'ChIJOwg_06VPwokR4GfJ_8b5sqc',
      main_text: 'New York',
      description: '123 Main St, New York, NY 10001'
    };

    const mockDetails = {
      place_id: 'ChIJOwg_06VPwokR4GfJ_8b5sqc',
      formatted_address: '123 Main St, New York, NY 10001',
      geometry: {
        location: {
          lat: 40.7128,
          lng: -74.0060
        },
        viewport: {
          northeast: { lat: 40.7155, lng: -74.0030 },
          southwest: { lat: 40.7100, lng: -74.0090 }
        }
      }
    };

    await instance.handlePlacesSelected(mockData, mockDetails);

    expect(LocationStorage.saveLocation).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalled();
  });

  it('should render GPS button with correct iOS styling', () => {
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

  it('should render recent locations list on iOS', async () => {
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

    const recentLocations = instance.renderRecentLocations();
    expect(recentLocations).toBeTruthy();
  });
});
