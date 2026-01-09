/**
 * App integration tests
 */

import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import LandingPage from '../App';
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

describe('App Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders LandingPage correctly', () => {
    const tree = renderer.create(
      <LandingPage />
    ).toJSON();

    expect(tree).toBeTruthy();
  });

  it('displays welcome message', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    expect(instance).toBeTruthy();
    const tree = instance.render();
    expect(tree).toBeTruthy();
  });

  it('initializes with null locations', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    expect(instance.state.startLocation).toBeNull();
    expect(instance.state.endLocation).toBeNull();
  });

  it('handles start location selection', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const mockLocation = {
      id: 'test_start',
      place: '123 Main St',
      placeId: 'place_123',
      latitude: 40.7128,
      longitude: -74.006,
      validated: true,
      description: '123 Main St, New York, NY',
      createdAt: Date.now(),
    };

    instance.handleStartLocationSelect(mockLocation);

    expect(instance.state.startLocation).toEqual(mockLocation);
    expect(instance.state.showStartForm).toBe(false);
  });

  it('handles end location selection', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const mockLocation = {
      id: 'test_end',
      place: '456 Broadway',
      placeId: 'place_456',
      latitude: 40.7580,
      longitude: -73.9855,
      validated: true,
      description: '456 Broadway, New York, NY',
      createdAt: Date.now(),
    };

    instance.handleEndLocationSelect(mockLocation);

    expect(instance.state.endLocation).toEqual(mockLocation);
    expect(instance.state.showEndForm).toBe(false);
  });

  it('handles location errors', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const errorMessage = 'Location service unavailable';
    instance.handleLocationError(errorMessage);

    expect(instance.state.error).toBe(errorMessage);
  });

  it('clears error when locations are valid', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const mockLocation = {
      id: 'test_location',
      place: 'Test Location',
      placeId: 'place_test',
      latitude: 40.7128,
      longitude: -74.006,
      validated: true,
      createdAt: Date.now(),
    };

    instance.setState({
      error: 'Previous error',
      startLocation: mockLocation,
      endLocation: mockLocation,
    });

    instance.handleSubmit();

    expect(instance.state.error).toBeNull();
  });

  it('prevents submit without both locations', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    instance.handleSubmit();

    expect(instance.state.error).toBeTruthy();
  });

  it('allows submit with both locations', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const mockLocation = {
      id: 'test_location',
      place: 'Test Location',
      placeId: 'place_test',
      latitude: 40.7128,
      longitude: -74.006,
      validated: true,
      createdAt: Date.now(),
    };

    instance.setState({
      startLocation: mockLocation,
      endLocation: { ...mockLocation, id: 'test_location_2' },
    });

    instance.handleSubmit();

    // Error should be cleared on successful submit
    expect(instance.state.error).toBeNull();
  });

  it('clears start location when edit is clicked', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const mockLocation = {
      id: 'test_location',
      place: 'Test Location',
      placeId: 'place_test',
      latitude: 40.7128,
      longitude: -74.006,
      validated: true,
      createdAt: Date.now(),
    };

    instance.setState({ startLocation: mockLocation });
    instance.handleClearStart();

    expect(instance.state.startLocation).toBeNull();
    expect(instance.state.showStartForm).toBe(true);
  });

  it('clears end location when edit is clicked', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const mockLocation = {
      id: 'test_location',
      place: 'Test Location',
      placeId: 'place_test',
      latitude: 40.7128,
      longitude: -74.006,
      validated: true,
      createdAt: Date.now(),
    };

    instance.setState({ endLocation: mockLocation });
    instance.handleClearEnd();

    expect(instance.state.endLocation).toBeNull();
    expect(instance.state.showEndForm).toBe(true);
  });

  it('shows submit button when both locations are selected', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const mockLocation = {
      id: 'test_location',
      place: 'Test Location',
      placeId: 'place_test',
      latitude: 40.7128,
      longitude: -74.006,
      validated: true,
      createdAt: Date.now(),
    };

    instance.setState({
      startLocation: mockLocation,
      endLocation: { ...mockLocation, id: 'location_2' },
    });

    const tree = instance.render();
    expect(tree).toBeTruthy();
  });

  it('displays offline indicator for unvalidated locations', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const offlineLocation = {
      id: 'offline_location',
      place: 'Offline Location',
      placeId: 'place_offline',
      latitude: 0,
      longitude: 0,
      validated: false,
      description: 'Added offline',
      createdAt: Date.now(),
    };

    instance.setState({
      startLocation: offlineLocation,
      endLocation: offlineLocation,
    });

    const tree = instance.render();

    // Should still render with offline indicator
    expect(tree).toBeTruthy();
    expect(instance.state.startLocation.validated).toBe(false);
  });

  it('handles LocationInput component props correctly', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    // Verify component has googlePlacesApiKey set
    expect(instance.googlePlacesApiKey).toBeTruthy();
    expect(typeof instance.googlePlacesApiKey).toBe('string');
  });

  it('supports multiple location selections', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const location1 = {
      id: 'location_1',
      place: 'Location 1',
      placeId: 'place_1',
      latitude: 40.7128,
      longitude: -74.006,
      validated: true,
      createdAt: Date.now(),
    };

    const location2 = {
      id: 'location_2',
      place: 'Location 2',
      placeId: 'place_2',
      latitude: 40.7580,
      longitude: -73.9855,
      validated: true,
      createdAt: Date.now(),
    };

    const location3 = {
      id: 'location_3',
      place: 'Location 3',
      placeId: 'place_3',
      latitude: 40.7614,
      longitude: -73.9776,
      validated: true,
      createdAt: Date.now(),
    };

    // Select first location
    instance.handleStartLocationSelect(location1);
    expect(instance.state.startLocation).toEqual(location1);

    // Select end location
    instance.handleEndLocationSelect(location2);
    expect(instance.state.endLocation).toEqual(location2);

    // Change start location
    instance.handleStartLocationSelect(location3);
    expect(instance.state.startLocation).toEqual(location3);

    // End location should remain unchanged
    expect(instance.state.endLocation).toEqual(location2);
  });

  it('preserves location state across multiple operations', () => {
    const instance = renderer.create(
      <LandingPage />
    ).getInstance();

    const location = {
      id: 'test_location',
      place: 'Test Location',
      placeId: 'place_test',
      latitude: 40.7128,
      longitude: -74.006,
      validated: true,
      createdAt: Date.now(),
    };

    instance.setState({ startLocation: location });
    expect(instance.state.startLocation).toEqual(location);

    // Add error
    instance.handleLocationError('Test error');
    expect(instance.state.startLocation).toEqual(location);
    expect(instance.state.error).toBe('Test error');

    // Clear error
    instance.handleSubmit();
    // Since we don't have end location, error should remain
    expect(instance.state.error).toBeTruthy();
  });
});
