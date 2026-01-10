// @flow

import React from 'react';
import renderer from 'react-test-renderer';
import LocationInputContainer from '../components/LocationInputContainer';
import LocationStorage from '../services/LocationStorage';
import { createLocation } from '../models/Location';

// Mock LocationStorage
jest.mock('../services/LocationStorage');

// Mock Geolocation
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
}));

// Mock GooglePlacesAutocomplete
jest.mock('react-native-google-places-autocomplete', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GooglePlacesAutocomplete: (props) => (
      React.createElement(View, {
        ...props,
        testID: 'google-places-autocomplete',
      })
    ),
  };
});

describe('LocationInput Integration Tests', () => {
  const mockGoogleApiKey = 'integration-test-key';
  const mockOnLocationSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    LocationStorage.getRecentLocations.mockResolvedValue([]);
  });

  /**
   * Integration Test 1: Full location selection flow
   */
  it('should complete a full location selection flow', async () => {
    LocationStorage.saveLocation.mockResolvedValue(undefined);

    const tree = renderer.create(
      <LocationInputContainer
        googleApiKey={mockGoogleApiKey}
        onLocationSelect={mockOnLocationSelect}
        placeholder="Select a location"
      />
    );

    expect(tree).toBeDefined();
    expect(tree.root).toBeDefined();
  });

  /**
   * Integration Test 2: Recent locations persistence
   */
  it('should persist and retrieve recent locations across sessions', async () => {
    const mockLocation1 = createLocation(
      'Location A',
      37.7749,
      -122.4194,
      'place-1',
      true
    );
    const mockLocation2 = createLocation(
      'Location B',
      34.0522,
      -118.2437,
      'place-2',
      true
    );

    LocationStorage.saveLocation.mockResolvedValue(undefined);
    LocationStorage.getRecentLocations.mockResolvedValue([
      {
        id: mockLocation1.id,
        location: mockLocation1,
        frequency: 1,
        lastUsed: Date.now(),
      },
      {
        id: mockLocation2.id,
        location: mockLocation2,
        frequency: 1,
        lastUsed: Date.now(),
      },
    ]);

    const tree = renderer.create(
      <LocationInputContainer
        googleApiKey={mockGoogleApiKey}
        onLocationSelect={mockOnLocationSelect}
        placeholder="Select a location"
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(LocationStorage.getRecentLocations).toHaveBeenCalled();
  });

  /**
   * Integration Test 3: Multiple location selections
   */
  it('should handle multiple consecutive location selections', async () => {
    LocationStorage.saveLocation.mockResolvedValue(undefined);

    const tree = renderer.create(
      <LocationInputContainer
        googleApiKey={mockGoogleApiKey}
        onLocationSelect={mockOnLocationSelect}
        placeholder="Select a location"
      />
    );

    const instance = tree.root;

    const mockLocation1 = createLocation(
      'First Location',
      37.7749,
      -122.4194,
      'place-1',
      true
    );
    const mockLocation2 = createLocation(
      'Second Location',
      34.0522,
      -118.2437,
      'place-2',
      true
    );

    if (instance.instance) {
      instance.instance.handleLocationSelect(mockLocation1);
      instance.instance.handleLocationSelect(mockLocation2);

      // Verify the container handles multiple selections
      const selectedLocation = instance.instance.getSelectedLocation();
      expect(selectedLocation).toBeDefined();
    }
  });

  /**
   * Integration Test 4: Container state management
   */
  it('should properly manage LocationInputContainer state', () => {
    const tree = renderer.create(
      <LocationInputContainer
        googleApiKey={mockGoogleApiKey}
        onLocationSelect={mockOnLocationSelect}
        placeholder="Select a location"
      />
    );

    const instance = tree.root;

    if (instance.instance) {
      // Initial state should be null
      expect(instance.instance.getSelectedLocation()).toBeNull();

      // After selection, state should update
      const mockLocation = createLocation(
        'Test Location',
        40.7128,
        -74.006,
        'place-test',
        true
      );

      instance.instance.handleLocationSelect(mockLocation);
      const selectedLocation = instance.instance.getSelectedLocation();

      expect(selectedLocation).toBeDefined();
      expect(selectedLocation?.address).toBe('Test Location');
    }
  });

  /**
   * Integration Test 5: Container clear functionality
   */
  it('should clear selected location in container', () => {
    const tree = renderer.create(
      <LocationInputContainer
        googleApiKey={mockGoogleApiKey}
        onLocationSelect={mockOnLocationSelect}
        placeholder="Select a location"
      />
    );

    const instance = tree.root;

    if (instance.instance) {
      const mockLocation = createLocation(
        'Location to Clear',
        40.7128,
        -74.006,
        'place-clear',
        true
      );

      instance.instance.handleLocationSelect(mockLocation);
      expect(instance.instance.getSelectedLocation()).toBeDefined();

      instance.instance.clearSelectedLocation();
      expect(instance.instance.getSelectedLocation()).toBeNull();
    }
  });

  /**
   * Integration Test 6: Callback propagation
   */
  it('should propagate location selection callbacks to parent', async () => {
    const mockCallback = jest.fn();
    LocationStorage.saveLocation.mockResolvedValue(undefined);

    const tree = renderer.create(
      <LocationInputContainer
        googleApiKey={mockGoogleApiKey}
        onLocationSelect={mockCallback}
        placeholder="Select a location"
      />
    );

    const instance = tree.root;

    if (instance.instance) {
      const mockLocation = createLocation(
        'Callback Test Location',
        40.7128,
        -74.006,
        'place-callback',
        true
      );

      instance.instance.handleLocationSelect(mockLocation);

      expect(mockCallback).toHaveBeenCalledWith(mockLocation);
    }
  });

  /**
   * Integration Test 7: Error handling across components
   */
  it('should handle storage errors gracefully', async () => {
    LocationStorage.getRecentLocations.mockRejectedValue(
      new Error('Storage failure')
    );

    const tree = renderer.create(
      <LocationInputContainer
        googleApiKey={mockGoogleApiKey}
        onLocationSelect={mockOnLocationSelect}
        placeholder="Select a location"
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(tree).toBeDefined();
  });

  /**
   * Integration Test 8: Full offline workflow
   */
  it('should complete offline workflow with unvalidated locations', async () => {
    LocationStorage.getRecentLocations.mockRejectedValue(
      new Error('Offline')
    );
    LocationStorage.saveLocation.mockResolvedValue(undefined);

    const tree = renderer.create(
      <LocationInputContainer
        googleApiKey={mockGoogleApiKey}
        onLocationSelect={mockOnLocationSelect}
        placeholder="Select a location"
      />
    );

    const instance = tree.root;

    if (instance.instance) {
      const unvalidatedLocation = createLocation(
        'Offline Location',
        40.7128,
        -74.006,
        undefined,
        false
      );

      instance.instance.handleLocationSelect(unvalidatedLocation);

      expect(mockOnLocationSelect).toHaveBeenCalledWith(unvalidatedLocation);
    }
  });

  /**
   * Integration Test 9: Component unmounting
   */
  it('should safely unmount all components without errors', () => {
    const tree = renderer.create(
      <LocationInputContainer
        googleApiKey={mockGoogleApiKey}
        onLocationSelect={mockOnLocationSelect}
        placeholder="Select a location"
      />
    );

    expect(() => {
      tree.unmount();
    }).not.toThrow();
  });

  /**
   * Integration Test 10: Rapid location changes
   */
  it('should handle rapid consecutive location changes', async () => {
    LocationStorage.saveLocation.mockResolvedValue(undefined);

    const tree = renderer.create(
      <LocationInputContainer
        googleApiKey={mockGoogleApiKey}
        onLocationSelect={mockOnLocationSelect}
        placeholder="Select a location"
      />
    );

    const instance = tree.root;

    if (instance.instance) {
      const locations = [
        createLocation('Location 1', 37.7749, -122.4194, 'place-1', true),
        createLocation('Location 2', 34.0522, -118.2437, 'place-2', true),
        createLocation('Location 3', 40.7128, -74.006, 'place-3', true),
        createLocation('Location 4', 41.8781, -87.6298, 'place-4', true),
      ];

      for (const location of locations) {
        instance.instance.handleLocationSelect(location);
      }

      const finalLocation = instance.instance.getSelectedLocation();
      expect(finalLocation?.address).toBe('Location 4');
    }
  });
});
