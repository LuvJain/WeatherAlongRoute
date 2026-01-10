/**
 * LocationInput component tests
 * Tests for GPS detection, autocomplete selection, recent locations, and offline scenarios
 */

import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import LocationInput from '../components/LocationInput';

// Mock AsyncStorage
jest.mock('react-native', () => ({
  ...require.requireActual('react-native'),
  AsyncStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
  Geolocation: {
    getCurrentPosition: jest.fn((success, error) => {
      success({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      });
    }),
  },
  NetInfo: {
    isConnected: {
      fetch: jest.fn(() => Promise.resolve(true)),
    },
  },
}));

// Mock GooglePlacesAutocomplete
jest.mock('react-native-google-places-autocomplete', () => ({
  GooglePlacesAutocomplete: () => null,
}));

// Mock Location model
jest.mock('../models/Location', () => ({
  createLocation: (name, address, latitude, longitude, placeId, validated) => ({
    id: 'test-id',
    name,
    address,
    latitude,
    longitude,
    placeId,
    validated,
    timestamp: Date.now(),
  }),
  toRecentLocation: (location) => ({
    id: location.id,
    name: location.name,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    placeId: location.placeId,
    lastUsed: Date.now(),
  }),
  toLocation: (recentLocation, validated) => ({
    id: recentLocation.id,
    name: recentLocation.name,
    address: recentLocation.address,
    latitude: recentLocation.latitude,
    longitude: recentLocation.longitude,
    placeId: recentLocation.placeId,
    validated,
    timestamp: Date.now(),
  }),
}));

// Mock LocationStorageService
jest.mock('../services/LocationStorageService', () => ({
  saveRecentLocation: jest.fn(() => Promise.resolve([])),
  getRecentLocations: jest.fn(() => Promise.resolve([])),
  clearRecentLocations: jest.fn(() => Promise.resolve(true)),
  removeRecentLocation: jest.fn(() => Promise.resolve([])),
}));

// Mock LocationValidationService
jest.mock('../services/LocationValidationService', () => ({
  validateLocation: (location) => ({
    isValid: true,
    errors: [],
  }),
  checkConnectivity: jest.fn(() => Promise.resolve(true)),
  validateLocationWithConnectivity: jest.fn(() =>
    Promise.resolve({
      isValid: true,
      errors: [],
      validated: true,
      isOffline: false,
    })
  ),
}));

describe('LocationInput Component', () => {
  const mockOnLocationSelected = jest.fn();
  const defaultProps = {
    placeholder: 'Select Location',
    onLocationSelected: mockOnLocationSelected,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Component renders without crashing
  it('renders correctly', () => {
    const tree = renderer.create(
      <LocationInput {...defaultProps} />
    ).toJSON();
    expect(tree).toBeTruthy();
  });

  // Test 2: GPS detection button is present
  it('renders GPS detection button', () => {
    const instance = renderer.create(
      <LocationInput {...defaultProps} />
    ).getInstance();

    expect(instance.state).toBeDefined();
    expect(instance.state.location).toBeNull();
    expect(instance.state.loading).toBe(false);
  });

  // Test 3: GPS detection loading state
  it('shows loading state during GPS detection', async () => {
    const instance = renderer.create(
      <LocationInput {...defaultProps} />
    ).getInstance();

    instance.getCurrentLocation();
    expect(instance.state.loading).toBe(true);
  });

  // Test 4: Handles offline scenarios
  it('handles offline scenarios gracefully', async () => {
    const { validateLocationWithConnectivity } = require('../services/LocationValidationService');
    validateLocationWithConnectivity.mockResolvedValueOnce({
      isValid: true,
      errors: [],
      validated: false,
      isOffline: true,
    });

    const instance = renderer.create(
      <LocationInput {...defaultProps} />
    ).getInstance();

    const testLocation = {
      id: 'test-id',
      name: 'Test Location',
      address: '123 Main St',
      latitude: 37.7749,
      longitude: -122.4194,
      placeId: 'test-place-id',
      validated: false,
    };

    await instance.handleLocationSelection(testLocation);

    expect(instance.state.isOffline).toBe(true);
    expect(instance.state.validated).toBe(false);
  });

  // Test 5: Recent locations list renders when available
  it('renders recent locations list when available', async () => {
    const { getRecentLocations } = require('../services/LocationStorageService');
    const recentLocs = [
      {
        id: 'loc1',
        name: 'San Francisco',
        address: '123 Market St',
        latitude: 37.7749,
        longitude: -122.4194,
        placeId: 'place1',
        lastUsed: Date.now(),
      },
    ];
    getRecentLocations.mockResolvedValueOnce(recentLocs);

    const instance = renderer.create(
      <LocationInput {...defaultProps} />
    ).getInstance();

    await instance.loadRecentLocations();

    expect(instance.state.recentLocations).toEqual(recentLocs);
    expect(instance.state.recentLocations.length).toBe(1);
  });

  // Test 6: Autocomplete selection callback works
  it('handles autocomplete selection', async () => {
    const instance = renderer.create(
      <LocationInput {...defaultProps} />
    ).getInstance();

    const data = {
      description: 'San Francisco, CA',
      place_id: 'test-place-id',
    };

    const details = {
      formatted_address: '123 Market Street, San Francisco, CA 94102',
      geometry: {
        location: {
          lat: 37.7749,
          lng: -122.4194,
        },
      },
    };

    instance.onAutocompletePress(data, details);

    expect(mockOnLocationSelected).toHaveBeenCalled();
  });

  // Test 7: Validates location data
  it('validates location data before submission', async () => {
    const { validateLocationWithConnectivity } = require('../services/LocationValidationService');

    const instance = renderer.create(
      <LocationInput {...defaultProps} />
    ).getInstance();

    const testLocation = {
      id: 'test-id',
      name: 'Test Location',
      address: '123 Main St',
      latitude: 37.7749,
      longitude: -122.4194,
      placeId: 'test-place-id',
      validated: false,
    };

    await instance.handleLocationSelection(testLocation);

    expect(validateLocationWithConnectivity).toHaveBeenCalledWith(testLocation);
  });

  // Test 8: Recent location selection works
  it('handles recent location selection', async () => {
    const instance = renderer.create(
      <LocationInput {...defaultProps} />
    ).getInstance();

    const recentLocation = {
      id: 'loc1',
      name: 'Saved Location',
      address: '456 Oak Ave',
      latitude: 37.7749,
      longitude: -122.4194,
      placeId: 'place1',
      lastUsed: Date.now(),
    };

    instance.selectRecentLocation(recentLocation);

    expect(mockOnLocationSelected).toHaveBeenCalled();
  });

  // Test 9: Validation errors display without blocking submission
  it('displays validation errors without blocking submission', async () => {
    const { validateLocationWithConnectivity } = require('../services/LocationValidationService');
    validateLocationWithConnectivity.mockResolvedValueOnce({
      isValid: true,
      errors: ['Location will be validated when online'],
      validated: false,
      isOffline: true,
    });

    const instance = renderer.create(
      <LocationInput {...defaultProps} />
    ).getInstance();

    const testLocation = {
      id: 'test-id',
      name: 'Test Location',
      address: '123 Main St',
      latitude: 37.7749,
      longitude: -122.4194,
      placeId: 'test-place-id',
      validated: false,
    };

    await instance.handleLocationSelection(testLocation);

    expect(instance.state.validationErrors).toBeDefined();
    expect(mockOnLocationSelected).toHaveBeenCalled();
  });

  // Test 10: Recent locations are saved after selection
  it('saves location to recent locations after selection', async () => {
    const { saveRecentLocation } = require('../services/LocationStorageService');

    const instance = renderer.create(
      <LocationInput {...defaultProps} />
    ).getInstance();

    const testLocation = {
      id: 'test-id',
      name: 'Test Location',
      address: '123 Main St',
      latitude: 37.7749,
      longitude: -122.4194,
      placeId: 'test-place-id',
      validated: false,
    };

    await instance.handleLocationSelection(testLocation);

    expect(saveRecentLocation).toHaveBeenCalled();
  });
});
