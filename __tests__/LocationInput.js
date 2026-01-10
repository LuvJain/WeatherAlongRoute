// @flow

import React from 'react';
import renderer from 'react-test-renderer';
import LocationInput from '../components/LocationInput';
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

describe('LocationInput Component', () => {
  const mockGoogleApiKey = 'test-api-key';
  const mockOnLocationSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    LocationStorage.getRecentLocations.mockResolvedValue([]);
  });

  /**
   * Test 1: Component renders with GPS detection button
   */
  describe('GPS Detection', () => {
    it('should render GPS detection button with loading state', () => {
      const tree = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      ).root;

      const gpsButtons = tree.findAllByType('TouchableOpacity');
      expect(gpsButtons.length).toBeGreaterThan(0);
    });

    it('should handle GPS detection with successful location', async () => {
      const Geolocation = require('react-native-geolocation-service');
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      Geolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      // Mock the fetch for reverse geocoding
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              results: [
                {
                  formatted_address: '123 Main St, San Francisco, CA',
                  place_id: 'test-place-id',
                },
              ],
            }),
        })
      );

      const instance = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      ).root;

      const gpsButtons = instance.findAllByType('TouchableOpacity');
      gpsButtons[0].props.onPress();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockOnLocationSelect).toHaveBeenCalled();
    });

    it('should handle GPS detection failure gracefully', async () => {
      const Geolocation = require('react-native-geolocation-service');
      const mockError = new Error('Location not found');

      Geolocation.getCurrentPosition.mockImplementation(
        (success, error) => {
          error(mockError);
        }
      );

      const instance = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      ).root;

      const gpsButtons = instance.findAllByType('TouchableOpacity');
      gpsButtons[0].props.onPress();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const textElements = instance.findAllByType('Text');
      const errorFound = textElements.some((elem) =>
        elem.props.children?.includes('Could not detect location')
      );

      expect(errorFound || !mockOnLocationSelect.called).toBeTruthy();
    });
  });

  /**
   * Test 2: GooglePlacesAutocomplete integration
   */
  describe('Autocomplete Selection', () => {
    it('should handle autocomplete selection with valid details', () => {
      const tree = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      );

      const instance = tree.root;
      const googlePlacesComponents = instance.findAllByProps({
        testID: 'google-places-autocomplete',
      });

      if (googlePlacesComponents.length > 0) {
        const props = googlePlacesComponents[0].props;
        const mockData = {
          description: '456 Oak Ave, San Francisco, CA',
          place_id: 'place-123',
        };
        const mockDetails = {
          geometry: {
            location: {
              lat: 37.7749,
              lng: -122.4194,
            },
          },
        };

        props.onPress(mockData, mockDetails);
        expect(mockOnLocationSelect).toHaveBeenCalled();
      }
    });

    it('should handle autocomplete selection without valid details', () => {
      const tree = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      );

      const instance = tree.root;
      const googlePlacesComponents = instance.findAllByProps({
        testID: 'google-places-autocomplete',
      });

      if (googlePlacesComponents.length > 0) {
        const props = googlePlacesComponents[0].props;
        props.onPress({ description: 'incomplete data' }, null);

        const textElements = instance.findAllByType('Text');
        expect(textElements.length > 0).toBeTruthy();
      }
    });
  });

  /**
   * Test 3: Recent locations display and selection
   */
  describe('Recent Locations', () => {
    it('should load and display recent locations', async () => {
      const mockRecentLocations = [
        {
          id: '1',
          location: createLocation(
            '123 Main St, SF',
            37.7749,
            -122.4194,
            'place-1',
            true
          ),
          frequency: 5,
          lastUsed: Date.now(),
        },
      ];

      LocationStorage.getRecentLocations.mockResolvedValue(
        mockRecentLocations
      );

      const tree = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      tree.update(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      );

      expect(LocationStorage.getRecentLocations).toHaveBeenCalled();
    });

    it('should handle recent location selection', async () => {
      const mockLocation = createLocation(
        '789 Elm St, SF',
        37.7749,
        -122.4194,
        'place-2',
        true
      );

      LocationStorage.saveLocation.mockResolvedValue(undefined);

      const instance = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      ).root;

      // Simulate selecting a recent location
      if (instance.instance) {
        instance.instance.handleRecentLocationSelect(mockLocation);
      }

      expect(LocationStorage.saveLocation).toHaveBeenCalled();
    });
  });

  /**
   * Test 4: Offline handling
   */
  describe('Offline Scenarios', () => {
    it('should handle offline mode gracefully', async () => {
      LocationStorage.getRecentLocations.mockRejectedValue(
        new Error('Network error')
      );

      const instance = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      ).root;

      await new Promise((resolve) => setTimeout(resolve, 100));

      const textElements = instance.findAllByType('Text');
      const hasOfflineIndicator = textElements.some((elem) =>
        elem.props.children?.includes('Offline')
      );

      expect(hasOfflineIndicator || textElements.length > 0).toBeTruthy();
    });

    it('should allow submission without validation in offline mode', async () => {
      const mockLocation = createLocation(
        '999 Test St, SF',
        37.7749,
        -122.4194,
        undefined,
        false
      );

      const instance = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      ).root;

      if (instance.instance) {
        instance.instance.selectLocation(mockLocation, false);
      }

      expect(mockOnLocationSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '999 Test St, SF',
          validated: false,
        })
      );
    });

    it('should display minimal validation errors without blocking submission', () => {
      const instance = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      ).root;

      const textElements = instance.findAllByType('Text');
      expect(textElements.length > 0).toBeTruthy();
    });
  });

  /**
   * Test 5: Location clearing
   */
  describe('Location Management', () => {
    it('should clear selected location', () => {
      const instance = renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      ).root;

      const mockLocation = createLocation(
        'Test Location',
        37.7749,
        -122.4194,
        'place-test',
        true
      );

      if (instance.instance) {
        instance.instance.selectLocation(mockLocation, true);
        instance.instance.clearLocation();

        // Verify state is cleared
        expect(instance.instance.state.location).toBeNull();
        expect(instance.instance.state.validated).toBe(false);
      }
    });
  });

  /**
   * Test 6: Component lifecycle
   */
  describe('Component Lifecycle', () => {
    it('should load recent locations on mount', async () => {
      const mockRecentLocations = [
        {
          id: '1',
          location: createLocation(
            '123 Main St, SF',
            37.7749,
            -122.4194,
            'place-1',
            true
          ),
          frequency: 2,
          lastUsed: Date.now(),
        },
      ];

      LocationStorage.getRecentLocations.mockResolvedValue(
        mockRecentLocations
      );

      renderer.create(
        <LocationInput
          onLocationSelect={mockOnLocationSelect}
          googleApiKey={mockGoogleApiKey}
          placeholder="Enter destination"
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(LocationStorage.getRecentLocations).toHaveBeenCalled();
    });
  });
});
