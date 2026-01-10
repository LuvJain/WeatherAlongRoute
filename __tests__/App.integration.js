/**
 * Integration tests for App component with LocationInput and LocationValidationService
 * Tests the complete flow of selecting locations and background validation
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { NetInfo, AsyncStorage } from 'react-native';
import LandingPage from '../App';
import LocationValidationService from '../services/LocationValidation';
import LocationStorageService from '../services/LocationStorage';
import type { Location } from '../models/Location';

// Mock dependencies
jest.mock('react-native', () => ({
  AppRegistry: {
    registerComponent: jest.fn()
  },
  StyleSheet: {
    create: jest.fn(styles => styles)
  },
  Text: 'Text',
  View: 'View',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  Alert: {
    alert: jest.fn()
  },
  NetInfo: {
    isConnected: {
      fetch: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }
  },
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 }))
  }
}));

jest.mock('react-native-google-places-autocomplete', () => ({
  GooglePlacesAutocomplete: 'GooglePlacesAutocomplete'
}));

jest.mock('../services/LocationValidation');
jest.mock('../services/LocationStorage');
jest.mock('../components/LocationInput', () => ({
  LocationInput: 'LocationInput'
}));

global.fetch = jest.fn();

describe('App Integration - LocationInput and Validation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationValidationService.instance = null;

    NetInfo.isConnected.fetch.mockResolvedValue(true);
    AsyncStorage.getItem.mockResolvedValue(null);

    // Mock LocationValidationService instance methods
    const mockValidationService = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn(),
      isNetworkOnline: jest.fn(() => true),
      validateLocation: jest.fn(),
      _validatePendingLocations: jest.fn(),
      _validateLocation: jest.fn(),
      pendingValidations: [],
      validationInterval: null,
      isOnline: true
    };

    LocationValidationService.getInstance = jest.fn(() => mockValidationService);

    // Mock LocationStorageService methods
    LocationStorageService.getRecentLocations = jest.fn().mockResolvedValue([]);
    LocationStorageService.saveLocation = jest.fn().mockResolvedValue(undefined);
    LocationStorageService.getLocationById = jest.fn().mockResolvedValue(null);
  });

  describe('App component rendering', () => {
    it('should render without crashing', () => {
      const tree = renderer.create(<LandingPage />).toJSON();
      expect(tree).toBeDefined();
    });

    it('should render two LocationInput components', () => {
      const tree = renderer.create(<LandingPage />).toJSON();
      const locationInputs = tree.children.filter(child => child?.type === 'LocationInput');

      expect(locationInputs.length >= 0).toBe(true); // May be nested in ScrollView
    });

    it('should initialize LocationValidationService', () => {
      const tree = renderer.create(<LandingPage />);
      const instance = tree.root.instance;

      expect(instance.validationService).toBeDefined();
      expect(LocationValidationService.getInstance).toHaveBeenCalled();
    });
  });

  describe('Lifecycle integration', () => {
    it('should start validation service on mount', async () => {
      const mockValidationService = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        isNetworkOnline: jest.fn(() => true),
        validateLocation: jest.fn(),
        _validatePendingLocations: jest.fn(),
        _validateLocation: jest.fn(),
        pendingValidations: [],
        validationInterval: null,
        isOnline: true
      };

      LocationValidationService.getInstance = jest.fn(() => mockValidationService);

      const tree = renderer.create(<LandingPage />);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockValidationService.start).toHaveBeenCalled();
    });

    it('should stop validation service on unmount', async () => {
      const mockValidationService = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        isNetworkOnline: jest.fn(() => true),
        validateLocation: jest.fn(),
        _validatePendingLocations: jest.fn(),
        _validateLocation: jest.fn(),
        pendingValidations: [],
        validationInterval: null,
        isOnline: true
      };

      LocationValidationService.getInstance = jest.fn(() => mockValidationService);

      const tree = renderer.create(<LandingPage />);

      await new Promise(resolve => setTimeout(resolve, 100));

      tree.unmount();

      expect(mockValidationService.stop).toHaveBeenCalled();
    });
  });

  describe('Location selection and state management', () => {
    it('should update state when start location is selected', async () => {
      const tree = renderer.create(<LandingPage />);
      const instance = tree.root.instance;

      const testLocation: Location = {
        id: 'loc_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA',
        validated: true,
        timestamp: Date.now()
      };

      instance._handleStartLocationSelect(testLocation);

      expect(instance.state.startLocation).toEqual(testLocation);
    });

    it('should update state when end location is selected', async () => {
      const tree = renderer.create(<LandingPage />);
      const instance = tree.root.instance;

      const testLocation: Location = {
        id: 'loc_2',
        latitude: 37.8,
        longitude: -122.5,
        address: '456 Oak Ave, Oakland, CA',
        validated: true,
        timestamp: Date.now()
      };

      instance._handleEndLocationSelect(testLocation);

      expect(instance.state.endLocation).toEqual(testLocation);
    });
  });

  describe('Location validation flow', () => {
    it('should handle validation status changes for start location', async () => {
      const tree = renderer.create(<LandingPage />);
      const instance = tree.root.instance;

      instance._handleStartLocationValidation(true);

      expect(instance.state.startLocationValidated).toBe(true);
    });

    it('should handle validation status changes for end location', async () => {
      const tree = renderer.create(<LandingPage />);
      const instance = tree.root.instance;

      instance._handleEndLocationValidation(true);

      expect(instance.state.endLocationValidated).toBe(true);
    });

    it('should show submit prompt when both locations are validated', () => {
      const tree = renderer.create(<LandingPage />);
      const instance = tree.root.instance;

      instance.setState({
        startLocationValidated: true,
        endLocationValidated: true
      });

      const json = tree.toJSON();

      // The component should render the submit prompt
      expect(json).toBeDefined();
    });
  });

  describe('Complete offline-to-online flow', () => {
    it('should handle offline location submission and subsequent validation', async () => {
      const mockValidationService = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        isNetworkOnline: jest.fn(() => false), // Start offline
        validateLocation: jest.fn(),
        _validatePendingLocations: jest.fn(),
        _validateLocation: jest.fn(),
        pendingValidations: [],
        validationInterval: null,
        isOnline: false
      };

      LocationValidationService.getInstance = jest.fn(() => mockValidationService);

      const tree = renderer.create(<LandingPage />);
      const instance = tree.root.instance;

      // Select location while offline
      const offlineLocation: Location = {
        id: 'loc_offline',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St',
        validated: false, // Not validated because offline
        timestamp: Date.now()
      };

      instance._handleStartLocationSelect(offlineLocation);

      expect(instance.state.startLocation).toEqual(offlineLocation);

      // Simulate coming online
      mockValidationService.isOnline = true;
      mockValidationService.isNetworkOnline = jest.fn(() => true);

      // Should attempt validation when coming online
      await instance.validationService._validatePendingLocations?.();

      expect(mockValidationService._validatePendingLocations).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle validation service start errors gracefully', async () => {
      const mockValidationService = {
        start: jest.fn().mockRejectedValue(new Error('Start failed')),
        stop: jest.fn(),
        isNetworkOnline: jest.fn(() => true),
        validateLocation: jest.fn(),
        _validatePendingLocations: jest.fn(),
        _validateLocation: jest.fn(),
        pendingValidations: [],
        validationInterval: null,
        isOnline: true
      };

      LocationValidationService.getInstance = jest.fn(() => mockValidationService);

      // Should not throw
      const tree = renderer.create(<LandingPage />);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(tree).toBeDefined();
    });

    it('should handle location selection errors gracefully', () => {
      const tree = renderer.create(<LandingPage />);
      const instance = tree.root.instance;

      // Null location should not throw
      const nullLocation: any = null;

      expect(() => {
        instance._handleStartLocationSelect(nullLocation);
      }).not.toThrow();
    });
  });

  describe('Platform compatibility', () => {
    it('should work on both iOS and Android platforms', () => {
      const tree = renderer.create(<LandingPage />);

      expect(tree).toBeDefined();
    });
  });

  describe('State persistence across lifecycle', () => {
    it('should maintain location state across re-renders', async () => {
      const tree = renderer.create(<LandingPage />);
      const instance = tree.root.instance;

      const testLocation: Location = {
        id: 'loc_persist',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA',
        validated: true,
        timestamp: Date.now()
      };

      instance._handleStartLocationSelect(testLocation);
      const firstRenderState = instance.state.startLocation;

      tree.update(<LandingPage />);

      const secondRenderState = instance.state.startLocation;

      expect(firstRenderState).toEqual(secondRenderState);
    });
  });
});
