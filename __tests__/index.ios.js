import 'react-native';
import React from 'react';
import Index from '../index.ios.js';
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

describe('iOS Platform Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Index component correctly on iOS', () => {
    const tree = renderer.create(
      <Index />
    );
    expect(tree).toBeTruthy();
  });

  it('LocationInput renders correctly on iOS', () => {
    const mockCallback = jest.fn();
    const tree = renderer.create(
      <LocationInput
        placeholder="Select Location"
        onLocationSelected={mockCallback}
      />
    );
    expect(tree).toBeTruthy();
  });

  it('LocationInput GPS button accessible on iOS', () => {
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

  it('LocationInput renders recent locations list on iOS', async () => {
    const { getRecentLocations } = require('../services/LocationStorageService');
    const mockCallback = jest.fn();

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
      <LocationInput
        placeholder="Select Location"
        onLocationSelected={mockCallback}
      />
    ).getInstance();

    await instance.loadRecentLocations();
    expect(instance.state.recentLocations.length).toBeGreaterThan(0);
  });
});
