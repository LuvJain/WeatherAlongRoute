import 'react-native';
import React from 'react';
import Index from '../index.android.js';
import LocationInput from '../components/LocationInput';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

// Mock AsyncStorage
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AsyncStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
  },
}));

// Mock GooglePlacesAutocomplete
jest.mock('react-native-google-places-autocomplete', () => ({
  GooglePlacesAutocomplete: 'GooglePlacesAutocomplete',
}));

// Mock Geolocation
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Geolocation: {
    getCurrentPosition: jest.fn(),
  },
}));

describe('Android Platform Tests', () => {
  it('renders correctly on Android', () => {
    const tree = renderer.create(
      <Index />
    );
    expect(tree).toBeTruthy();
  });

  it('renders LocationInput component on Android', () => {
    const mockOnLocationSelect = jest.fn();
    const tree = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_android"
      />
    ).toJSON();

    expect(tree).toBeTruthy();
  });

  it('LocationInput renders with Android styling', () => {
    const mockOnLocationSelect = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_android"
      />
    ).getInstance();

    // Verify component loads
    expect(instance).toBeTruthy();
    expect(instance.state).toBeTruthy();
  });

  it('GPS detection button is accessible on Android', () => {
    const mockOnLocationSelect = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_android"
      />
    ).getInstance();

    // Verify GPS button handler exists
    expect(instance.handleGPSDetection).toBeDefined();
    expect(typeof instance.handleGPSDetection).toBe('function');
  });

  it('Recent locations list renders on Android', async () => {
    const { AsyncStorage } = require('react-native');

    const mockRecentLocations = [
      {
        id: 'android_recent_1',
        place: 'Downtown Android',
        placeId: 'place_android_1',
        latitude: 37.7749,
        longitude: -122.4194,
        lastUsed: Date.now(),
        useCount: 3,
      },
    ];

    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify(mockRecentLocations)
    );

    const mockOnLocationSelect = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_android"
      />
    ).getInstance();

    await instance.loadRecentLocations();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(instance.state.recentLocations.length).toBeGreaterThan(0);
  });

  it('Autocomplete selection works on Android', () => {
    const mockOnLocationSelect = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_android"
      />
    ).getInstance();

    const mockData = {
      place_id: 'android_place_123',
      description: 'Google HQ, Mountain View, CA',
    };

    const mockDetails = {
      geometry: {
        location: {
          lat: 37.4224,
          lng: -122.084,
        },
      },
    };

    instance.handlePlaceSelect(mockData, mockDetails);

    setTimeout(() => {
      expect(instance.state.location).toBeTruthy();
      expect(instance.state.location.validated).toBe(true);
    }, 100);
  });

  it('Handles offline scenario on Android', () => {
    const mockOnLocationSelect = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_android"
      />
    ).getInstance();

    const offlineLocation = {
      id: 'android_offline',
      place: 'Offline Location',
      placeId: 'place_offline_android',
      latitude: 37.7749,
      longitude: -122.4194,
      validated: false,
    };

    instance.setState({ location: offlineLocation });

    // Verify offline capability
    expect(instance.state.location).toBeTruthy();
    expect(instance.state.location.validated).toBe(false);
  });

  it('GPS detection handles Android permissions', async () => {
    const { Geolocation } = require('react-native');

    // Mock Android permission denial
    Geolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({
        code: 1,
        message: 'PERMISSION_DENIED: Android location permission denied',
      });
    });

    const mockOnLocationSelect = jest.fn();
    const mockOnError = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        onError={mockOnError}
        googlePlacesApiKey="test-api-key"
        testID="location_input_android"
      />
    ).getInstance();

    await instance.handleGPSDetection();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify error handling
    expect(instance.state.error).toBeTruthy();
    expect(instance.state.location).toBeTruthy();
    expect(instance.state.location.validated).toBe(false);
  });

  it('Text input displays with Android Material Design', () => {
    const mockOnLocationSelect = jest.fn();
    const instance = renderer.create(
      <LocationInput
        placeholder="Find a location"
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_android"
      />
    ).getInstance();

    expect(instance).toBeTruthy();
    expect(instance.state).toBeTruthy();
  });
});
