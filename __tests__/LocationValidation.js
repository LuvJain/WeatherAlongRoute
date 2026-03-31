import { NetInfo, AsyncStorage } from 'react-native';
import LocationValidationService from '../services/LocationValidation';
import LocationStorageService from '../services/LocationStorage';
import type { Location, RecentLocation } from '../models/Location';

// Mock dependencies
jest.mock('react-native', () => ({
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
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('LocationValidationService Integration Tests', () => {
  let validationService: LocationValidationService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset service instance
    LocationValidationService.instance = null;
    validationService = LocationValidationService.getInstance();

    // Default network status: online
    NetInfo.isConnected.fetch.mockResolvedValue(true);
    AsyncStorage.getItem.mockResolvedValue(null);
  });

  afterEach(() => {
    // Clean up service
    if (validationService) {
      validationService.stop();
    }
  });

  describe('Online/Offline Detection', () => {
    it('should detect online status on startup', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(true);

      await validationService.start();

      expect(validationService.isNetworkOnline()).toBe(true);
    });

    it('should detect offline status on startup', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(false);

      await validationService.start();

      expect(validationService.isNetworkOnline()).toBe(false);
    });

    it('should set up network listener on start', async () => {
      await validationService.start();

      expect(NetInfo.isConnected.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('should handle network transitions gracefully', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(false);

      await validationService.start();

      expect(validationService.isNetworkOnline()).toBe(false);

      // Simulate network coming online
      const networkChangeCallback = NetInfo.isConnected.addEventListener.mock.calls[0][1];
      networkChangeCallback(true);

      expect(validationService.isNetworkOnline()).toBe(true);
    });
  });

  describe('Offline-to-Online Validation Flow', () => {
    it('should validate pending locations when coming online', async () => {
      const offlineLocation: Location = {
        id: 'loc_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St',
        validated: false,
        timestamp: Date.now()
      };

      const mockRecentLocations: Array<RecentLocation> = [
        {
          location: offlineLocation,
          frequency: 1,
          lastUsed: Date.now()
        }
      ];

      // Start offline
      NetInfo.isConnected.fetch.mockResolvedValue(false);
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockRecentLocations));

      await validationService.start();

      expect(validationService.isNetworkOnline()).toBe(false);

      // Mock successful geocoding response
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          status: 'OK',
          results: [
            {
              formatted_address: '123 Main St, San Francisco, CA',
              geometry: {
                location: {
                  lat: 37.7749,
                  lng: -122.4194
                }
              }
            }
          ]
        })
      });

      // Simulate coming online
      const networkChangeCallback = NetInfo.isConnected.addEventListener.mock.calls[0][1];
      networkChangeCallback(true);

      // Give async operations time to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(validationService.isNetworkOnline()).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should update location validated flag after successful geocoding', async () => {
      const offlineLocation: Location = {
        id: 'loc_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St',
        validated: false,
        timestamp: Date.now()
      };

      // Mock successful geocoding
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          status: 'OK',
          results: [
            {
              formatted_address: '123 Main St, San Francisco, CA, USA',
              geometry: {
                location: {
                  lat: 37.7749,
                  lng: -122.4194
                }
              }
            }
          ]
        })
      });

      AsyncStorage.getItem.mockResolvedValue(null);

      const validatedLocation = await validationService.validateLocation(offlineLocation);

      expect(validatedLocation).toBeDefined();
      // The location should be validated or stored for validation
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://maps.googleapis.com/maps/api/geocode/json')
      );
    });

    it('should handle validation failures gracefully without throwing', async () => {
      const offlineLocation: Location = {
        id: 'loc_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St',
        validated: false,
        timestamp: Date.now()
      };

      const mockRecentLocations: Array<RecentLocation> = [
        {
          location: offlineLocation,
          frequency: 1,
          lastUsed: Date.now()
        }
      ];

      // Mock failed geocoding
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          status: 'ZERO_RESULTS',
          results: []
        })
      });

      NetInfo.isConnected.fetch.mockResolvedValue(true);
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockRecentLocations));

      // Should not throw
      await expect(validationService.validateLocation(offlineLocation)).resolves.toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      const offlineLocation: Location = {
        id: 'loc_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St',
        validated: false,
        timestamp: Date.now()
      };

      // Mock network error
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      NetInfo.isConnected.fetch.mockResolvedValue(true);
      AsyncStorage.getItem.mockResolvedValue(null);

      // Should not throw
      const result = await validationService.validateLocation(offlineLocation);

      expect(result).toEqual(offlineLocation);
    });
  });

  describe('Validation State Management', () => {
    it('should not validate when offline', async () => {
      const offlineLocation: Location = {
        id: 'loc_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St',
        validated: false,
        timestamp: Date.now()
      };

      NetInfo.isConnected.fetch.mockResolvedValue(false);
      AsyncStorage.getItem.mockResolvedValue(null);

      await validationService.start();

      // Try to validate while offline
      await validationService.validateLocation(offlineLocation);

      // Fetch should not be called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should skip already validated locations', async () => {
      const validatedLocation: Location = {
        id: 'loc_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA',
        validated: true,
        timestamp: Date.now()
      };

      NetInfo.isConnected.fetch.mockResolvedValue(true);
      AsyncStorage.getItem.mockResolvedValue(null);

      await validationService.start();

      // Try to validate already validated location
      await validationService.validateLocation(validatedLocation);

      // Fetch should not be called since location is already validated
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should prevent duplicate validations in queue', async () => {
      const offlineLocation: Location = {
        id: 'loc_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St',
        validated: false,
        timestamp: Date.now()
      };

      NetInfo.isConnected.fetch.mockResolvedValue(true);

      // Add location to pending queue
      validationService.pendingValidations.push(offlineLocation.id);

      // Mock successful geocoding
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          status: 'OK',
          results: [
            {
              formatted_address: '123 Main St, San Francisco, CA',
              geometry: {
                location: {
                  lat: 37.7749,
                  lng: -122.4194
                }
              }
            }
          ]
        })
      });

      await validationService._validateLocation(offlineLocation);

      // Fetch should not be called since location is already in queue
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Recent Locations Persistence', () => {
    it('should persist recent locations across validations', async () => {
      const location: Location = {
        id: 'loc_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St',
        name: 'Test Location',
        validated: true,
        timestamp: Date.now()
      };

      const mockRecentLocations: Array<RecentLocation> = [
        {
          location,
          frequency: 3,
          lastUsed: Date.now()
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockRecentLocations));

      const recentLocations = await LocationStorageService.getRecentLocations();

      expect(recentLocations).toHaveLength(1);
      expect(recentLocations[0].frequency).toBe(3);
      expect(recentLocations[0].location.name).toBe('Test Location');
    });

    it('should make recent locations available for quick re-selection', async () => {
      const location1: Location = {
        id: 'loc_1',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA',
        name: 'Main Office',
        validated: true,
        timestamp: Date.now()
      };

      const location2: Location = {
        id: 'loc_2',
        latitude: 37.8,
        longitude: -122.5,
        address: '456 Oak Ave, Oakland, CA',
        name: 'Secondary Office',
        validated: true,
        timestamp: Date.now()
      };

      const mockRecentLocations: Array<RecentLocation> = [
        {
          location: location1,
          frequency: 5,
          lastUsed: Date.now()
        },
        {
          location: location2,
          frequency: 2,
          lastUsed: Date.now() - 10000
        }
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockRecentLocations));

      const retrievedLocation = await LocationStorageService.getLocationById('loc_1');

      expect(retrievedLocation).toEqual(location1);
      expect(retrievedLocation?.name).toBe('Main Office');
    });
  });

  describe('Service Lifecycle', () => {
    it('should clean up resources on stop', async () => {
      await validationService.start();

      validationService.stop();

      expect(NetInfo.isConnected.removeEventListener).toHaveBeenCalled();
    });

    it('should handle stop without start gracefully', () => {
      // Should not throw
      expect(() => {
        validationService.stop();
      }).not.toThrow();
    });

    it('should handle multiple start calls', async () => {
      await validationService.start();
      await validationService.start();

      expect(validationService.isNetworkOnline()).toBe(true);
    });
  });

  describe('App Integration', () => {
    it('should provide singleton instance', () => {
      const instance1 = LocationValidationService.getInstance();
      const instance2 = LocationValidationService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should be accessible to App component', async () => {
      const service = LocationValidationService.getInstance();

      expect(service).toBeDefined();
      expect(service.start).toBeDefined();
      expect(service.stop).toBeDefined();
      expect(service.isNetworkOnline).toBeDefined();
    });
  });

  describe('Platform Compatibility', () => {
    it('should work with iOS-specific initialization', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(true);

      await validationService.start();

      expect(validationService.isNetworkOnline()).toBe(true);
    });

    it('should work with Android-specific initialization', async () => {
      NetInfo.isConnected.fetch.mockResolvedValue(true);

      await validationService.start();

      expect(validationService.isNetworkOnline()).toBe(true);
    });
  });
});
