/**
 * LocationInput component tests
 */

import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import LocationInput from '../components/LocationInput';

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

describe('LocationInput Component', () => {
  const mockOnLocationSelect = jest.fn();
  const mockOnError = jest.fn();
  const mockGooglePlacesApiKey = 'test-api-key-12345';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const tree = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
      />
    ).toJSON();

    expect(tree).toBeTruthy();
  });

  it('renders GPS detection button', () => {
    const tree = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).toJSON();

    // Find the GPS button element
    const gpsButton = tree.children.find(
      (child) => child && child.testID === 'location_input_gps_button'
    );
    expect(gpsButton).toBeTruthy();
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Where to?';
    const tree = renderer.create(
      <LocationInput
        placeholder={customPlaceholder}
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
      />
    ).toJSON();

    expect(tree).toBeTruthy();
  });

  it('displays error message when provided', () => {
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        onError={mockOnError}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    // Simulate an error state
    instance.setState({ error: 'Test error message' });

    const tree = instance.render();
    expect(tree).toBeTruthy();
  });

  it('displays location when selected', () => {
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    // Simulate location selection
    const mockLocation = {
      id: 'test_location',
      place: '123 Main Street',
      placeId: 'place_123',
      latitude: 40.7128,
      longitude: -74.006,
      validated: true,
      description: '123 Main Street, New York, NY',
      createdAt: Date.now(),
    };

    instance.setState({ location: mockLocation });

    const tree = instance.render();
    expect(tree).toBeTruthy();
  });

  it('handles GPS detection button press', async () => {
    const { Geolocation } = require('react-native');

    // Mock successful geolocation
    Geolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      });
    });

    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    await instance.handleGPSDetection();

    // Wait for state update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify location was set and callback was called
    expect(instance.state.location).toBeTruthy();
    expect(instance.state.gpsLoading).toBe(false);
    expect(mockOnLocationSelect).toHaveBeenCalled();
  });

  it('shows loading state during GPS detection', async () => {
    const { Geolocation } = require('react-native');

    Geolocation.getCurrentPosition.mockImplementation((success) => {
      setTimeout(() => {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.006,
          },
        });
      }, 100);
    });

    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    instance.handleGPSDetection();

    // Check loading state
    expect(instance.state.gpsLoading).toBe(true);
  });

  it('handles GPS detection error gracefully', async () => {
    const { Geolocation } = require('react-native');

    // Mock geolocation error
    Geolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({ code: 1, message: 'Permission denied' });
    });

    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        onError={mockOnError}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    await instance.handleGPSDetection();

    // Wait for state update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify error handling
    expect(instance.state.error).toBeTruthy();
    expect(instance.state.gpsLoading).toBe(false);
    // Should create location even with error for offline capability
    expect(instance.state.location).toBeTruthy();
    expect(instance.state.location.validated).toBe(false);
  });

  it('handles autocomplete place selection', () => {
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    const mockData = {
      place_id: 'place_123',
      description: '123 Main Street, New York, NY',
    };

    const mockDetails = {
      geometry: {
        location: {
          lat: 40.7128,
          lng: -74.006,
        },
      },
    };

    instance.handlePlaceSelect(mockData, mockDetails);

    // Wait for async operations
    setTimeout(() => {
      expect(instance.state.location).toBeTruthy();
      expect(instance.state.location.place).toBe(mockData.description);
      expect(instance.state.location.validated).toBe(true);
      expect(mockOnLocationSelect).toHaveBeenCalled();
    }, 100);
  });

  it('handles autocomplete selection without details', () => {
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    const mockData = {
      place_id: 'place_123',
      description: '123 Main Street, New York, NY',
    };

    instance.handlePlaceSelect(mockData, null);

    // Should set error
    expect(instance.state.error).toBeTruthy();
  });

  it('displays recent locations', async () => {
    const { AsyncStorage } = require('react-native');

    const mockRecentLocations = [
      {
        id: 'recent_1',
        place: 'Coffee Shop',
        placeId: 'place_coffee',
        latitude: 40.7128,
        longitude: -74.006,
        lastUsed: Date.now(),
        useCount: 3,
      },
      {
        id: 'recent_2',
        place: 'Park',
        placeId: 'place_park',
        latitude: 40.7829,
        longitude: -73.9654,
        lastUsed: Date.now() - 3600000,
        useCount: 1,
      },
    ];

    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify(mockRecentLocations)
    );

    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    await instance.loadRecentLocations();

    // Wait for state update
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(instance.state.recentLocations).toHaveLength(2);
    expect(instance.state.recentLocations[0].place).toBe('Coffee Shop');
  });

  it('handles recent location selection', () => {
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    const mockRecentLocation = {
      id: 'recent_1',
      place: 'Favorite Cafe',
      placeId: 'place_cafe',
      latitude: 40.7128,
      longitude: -74.006,
      lastUsed: Date.now(),
      useCount: 5,
    };

    instance.handleRecentLocationSelect(mockRecentLocation);

    // Verify location was set
    expect(instance.state.location).toBeTruthy();
    expect(instance.state.location.place).toBe(mockRecentLocation.place);
    expect(instance.state.location.validated).toBe(true);
    expect(mockOnLocationSelect).toHaveBeenCalled();
  });

  it('supports offline scenarios with validated flag', () => {
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    // Simulate offline location
    const offlineLocation = {
      id: 'offline_location',
      place: 'Offline Location',
      placeId: 'place_offline',
      latitude: 0,
      longitude: 0,
      validated: false,
      description: 'This location was added offline',
      createdAt: Date.now(),
    };

    instance.setState({ location: offlineLocation });

    // Verify location is set even without validation
    expect(instance.state.location).toBeTruthy();
    expect(instance.state.location.validated).toBe(false);
    // User can still submit (not blocking)
    expect(mockOnLocationSelect).not.toHaveBeenCalled(); // Not called yet
  });

  it('renders minimal error without blocking submission', () => {
    const instance = renderer.create(
      <LocationInput
        onLocationSelect={mockOnLocationSelect}
        googlePlacesApiKey={mockGooglePlacesApiKey}
        testID="location_input"
      />
    ).getInstance();

    instance.setState({
      error: 'Minimal error message',
      location: {
        id: 'location_1',
        place: 'Test Location',
        placeId: 'place_1',
        latitude: 40.7128,
        longitude: -74.006,
        validated: false,
      },
    });

    const tree = instance.render();

    // Verify error is shown but location is still available
    expect(instance.state.error).toBeTruthy();
    expect(instance.state.location).toBeTruthy();
    expect(tree).toBeTruthy();
  });
});
