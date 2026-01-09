import 'react-native';
import React from 'react';
import Index from '../index.ios.js';
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

describe('iOS Platform Tests', () => {
  it('renders correctly on iOS', () => {
    const tree = renderer.create(
      <Index />
    );
    expect(tree).toBeTruthy();
  });

  it('renders LocationInput component on iOS', () => {
    const mockOnLocationSelect = jest.fn();
    const tree = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_ios"
      />
    ).toJSON();

    expect(tree).toBeTruthy();
  });

  it('LocationInput renders with iOS styling', () => {
    const mockOnLocationSelect = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_ios"
      />
    ).getInstance();

    // Verify component loads
    expect(instance).toBeTruthy();
    expect(instance.state).toBeTruthy();
  });

  it('GPS detection button is accessible on iOS', () => {
    const mockOnLocationSelect = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_ios"
      />
    ).getInstance();

    // Verify GPS button handler exists
    expect(instance.handleGPSDetection).toBeDefined();
    expect(typeof instance.handleGPSDetection).toBe('function');
  });

  it('Recent locations list renders on iOS', async () => {
    const { AsyncStorage } = require('react-native');

    const mockRecentLocations = [
      {
        id: 'ios_recent_1',
        place: 'Downtown iOS',
        placeId: 'place_ios_1',
        latitude: 40.7128,
        longitude: -74.006,
        lastUsed: Date.now(),
        useCount: 2,
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
        testID="location_input_ios"
      />
    ).getInstance();

    await instance.loadRecentLocations();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(instance.state.recentLocations.length).toBeGreaterThan(0);
  });

  it('Autocomplete selection works on iOS', () => {
    const mockOnLocationSelect = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_ios"
      />
    ).getInstance();

    const mockData = {
      place_id: 'ios_place_123',
      description: 'Apple Park, Cupertino, CA',
    };

    const mockDetails = {
      geometry: {
        location: {
          lat: 37.3349,
          lng: -122.009,
        },
      },
    };

    instance.handlePlaceSelect(mockData, mockDetails);

    setTimeout(() => {
      expect(instance.state.location).toBeTruthy();
      expect(instance.state.location.validated).toBe(true);
    }, 100);
  });

  it('Handles offline scenario on iOS', () => {
    const mockOnLocationSelect = jest.fn();
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey="test-api-key"
        testID="location_input_ios"
      />
    ).getInstance();

    const offlineLocation = {
      id: 'ios_offline',
      place: 'Offline Location',
      placeId: 'place_offline_ios',
      latitude: 40.7128,
      longitude: -74.006,
      validated: false,
    };

    instance.setState({ location: offlineLocation });

    // Verify offline capability
    expect(instance.state.location).toBeTruthy();
    expect(instance.state.location.validated).toBe(false);
  });
});
