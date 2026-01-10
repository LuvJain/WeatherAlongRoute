import 'react-native';
import React from 'react';
import Index from '../index.android.js';
import LocationInput from '../components/LocationInput';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

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

// Mock services
jest.mock('../models/Location');
jest.mock('../services/LocationStorageService');
jest.mock('../services/LocationValidationService');

describe('Android Platform Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Index component correctly on Android', () => {
    const tree = renderer.create(
      <Index />
    );
    expect(tree).toBeTruthy();
  });

  it('LocationInput renders correctly on Android', () => {
    const mockCallback = jest.fn();
    const tree = renderer.create(
      <LocationInput
        placeholder="Select Location"
        onLocationSelected={mockCallback}
      />
    );
    expect(tree).toBeTruthy();
  });

  it('LocationInput GPS button accessible on Android', () => {
    const mockCallback = jest.fn();
    const instance = renderer.create(
      <LocationInput
        placeholder="Select Location"
        onLocationSelected={mockCallback}
      />
    ).getInstance();

    expect(instance.getCurrentLocation).toBeDefined();
    expect(typeof instance.getCurrentLocation).toBe('function');
  });

  it('LocationInput handles offline on Android', async () => {
    const { validateLocationWithConnectivity } = require('../services/LocationValidationService');
    const mockCallback = jest.fn();

    validateLocationWithConnectivity.mockResolvedValueOnce({
      isValid: true,
      errors: [],
      validated: false,
      isOffline: true,
    });

    const instance = renderer.create(
      <LocationInput
        placeholder="Select Location"
        onLocationSelected={mockCallback}
      />
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
  });

  it('LocationInput renders validation errors on Android', async () => {
    const { validateLocationWithConnectivity } = require('../services/LocationValidationService');
    const mockCallback = jest.fn();

    validateLocationWithConnectivity.mockResolvedValueOnce({
      isValid: true,
      errors: ['Location validation pending'],
      validated: false,
      isOffline: true,
    });

    const instance = renderer.create(
      <LocationInput
        placeholder="Select Location"
        onLocationSelected={mockCallback}
      />
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
    expect(instance.state.validationErrors.length).toBeGreaterThan(0);
  });
});
