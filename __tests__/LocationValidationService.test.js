import 'react-native';
import { AsyncStorage, AppState, NetInfo } from 'react-native';
import LocationValidationService from '../src/services/LocationValidationService';
import LocationStorage from '../src/services/LocationStorage';
import type { Location, RecentLocation } from '../src/models/types';

jest.mock('react-native', () => ({
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentState: 'active'
  },
  NetInfo: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    fetch: jest.fn()
  }
}));

jest.mock('../src/services/LocationStorage', () => ({
  getRecentLocations: jest.fn(),
  setAllLocations: jest.fn(),
  updateLocation: jest.fn(),
  saveLocation: jest.fn()
}));

describe('LocationValidationService', () => {
  let service: LocationValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    LocationValidationService.instance = null;
    service = LocationValidationService.getInstance();
  });

  afterEach(() => {
    if (service) {
      service.stop();
    }
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LocationValidationService.getInstance();
      const instance2 = LocationValidationService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('start and stop', () => {
    it('should add event listeners on start', () => {
      service.start();

      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(NetInfo.addEventListener).toHaveBeenCalledWith(
        'connectionChange',
        expect.any(Function)
      );
    });

    it('should remove event listeners on stop', () => {
      service.start();
      service.stop();

      expect(AppState.removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
      expect(NetInfo.removeEventListener).toHaveBeenCalledWith(
        'connectionChange',
        expect.any(Function)
      );
    });
  });

  describe('Online/offline detection', () => {
    it('should detect online status', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true });

      service.start();
      await service.checkOnlineStatus();

      expect(service.getOnlineStatus()).toBe(true);
    });

    it('should detect offline status', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false });

      service.start();
      await service.checkOnlineStatus();

      expect(service.getOnlineStatus()).toBe(false);
    });

    it('should handle network check errors gracefully', async () => {
      NetInfo.fetch.mockRejectedValue(new Error('Network error'));

      service.start();
      await service.checkOnlineStatus();

      expect(service.getOnlineStatus()).toBe(false);
    });
  });

  describe('Online status listeners', () => {
    it('should notify listeners of status change', (done) => {
      let callCount = 0;
      const listener = jest.fn((isOnline) => {
        callCount++;
        if (callCount === 1) {
          expect(isOnline).toBe(false);
          done();
        }
      });

      service.addOnlineStatusListener(listener);
      service.isOnline = true;
      service.handleNetworkChange({ isConnected: false });
    });

    it('should allow unsubscribing from status changes', () => {
      const listener = jest.fn();

      const unsubscribe = service.addOnlineStatusListener(listener);
      service.handleNetworkChange({ isConnected: false });

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      service.handleNetworkChange({ isConnected: true });

      // Should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Location validation', () => {
    const mockLocation: Location = {
      id: 'loc_1',
      latitude: 40.7128,
      longitude: -74.0060,
      name: 'New York',
      address: '123 Main St',
      validated: false
    };

    const mockGeocodingResponse = {
      results: [
        {
          formatted_address: '123 Main St, New York, NY 10001, USA'
        }
      ]
    };

    it('should validate location when online', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeocodingResponse)
      });

      service.isOnline = true;
      LocationStorage.getRecentLocations.mockResolvedValue([mockLocation]);
      LocationStorage.updateLocation.mockResolvedValue({
        ...mockLocation,
        validated: true
      });

      const result = await service.validateLocation(mockLocation, 'test-api-key');

      expect(result).toBeDefined();
      expect(result?.validated).toBe(true);
      expect(result?.address).toBe('123 Main St, New York, NY 10001, USA');
    });

    it('should not validate location when offline', async () => {
      service.isOnline = false;

      const result = await service.validateLocation(mockLocation, 'test-api-key');

      expect(result).toBeNull();
    });

    it('should not re-validate already validated locations', async () => {
      const validatedLocation = { ...mockLocation, validated: true };

      const result = await service.validateLocation(validatedLocation, 'test-api-key');

      expect(result).toEqual(validatedLocation);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      service.isOnline = true;

      const result = await service.validateLocation(mockLocation, 'test-api-key');

      expect(result).toBeNull();
    });

    it('should handle geocoding API failures', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403
      });

      service.isOnline = true;

      const result = await service.validateLocation(mockLocation, 'test-api-key');

      expect(result).toBeNull();
    });

    it('should update location address after validation', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeocodingResponse)
      });

      service.isOnline = true;
      LocationStorage.getRecentLocations.mockResolvedValue([mockLocation]);
      LocationStorage.updateLocation.mockResolvedValue({
        ...mockLocation,
        validated: true,
        address: '123 Main St, New York, NY 10001, USA'
      });

      await service.validateLocation(mockLocation, 'test-api-key');

      expect(LocationStorage.updateLocation).toHaveBeenCalled();
    });
  });

  describe('Validate pending locations', () => {
    const mockPendingLocations: RecentLocation[] = [
      {
        id: 'loc_1',
        latitude: 40.7128,
        longitude: -74.0060,
        name: 'New York',
        address: '123 Main St',
        validated: false,
        frequency: 1,
        lastUsed: Date.now()
      },
      {
        id: 'loc_2',
        latitude: 34.0522,
        longitude: -118.2437,
        name: 'Los Angeles',
        address: '456 Oak Ave',
        validated: false,
        frequency: 1,
        lastUsed: Date.now()
      }
    ];

    const mockGeocodingResponse = {
      results: [
        {
          formatted_address: 'Validated Address'
        }
      ]
    };

    it('should validate all pending locations when online', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeocodingResponse)
      });

      service.isOnline = true;
      LocationStorage.getRecentLocations.mockResolvedValue(mockPendingLocations);
      LocationStorage.updateLocation.mockResolvedValue({
        validated: true
      });

      await service.validatePendingLocations('test-api-key');

      // Should attempt to validate each pending location
      expect(LocationStorage.getRecentLocations).toHaveBeenCalled();
      expect(LocationStorage.updateLocation).toHaveBeenCalled();
    });

    it('should not validate when offline', async () => {
      service.isOnline = false;
      LocationStorage.getRecentLocations.mockResolvedValue(mockPendingLocations);

      await service.validatePendingLocations('test-api-key');

      // Should not attempt to update locations
      expect(LocationStorage.updateLocation).not.toHaveBeenCalled();
    });

    it('should not re-validate if already validating', async () => {
      service.isValidating = true;
      LocationStorage.getRecentLocations.mockResolvedValue(mockPendingLocations);

      await service.validatePendingLocations('test-api-key');

      // Should return early and not call getRecentLocations
      expect(LocationStorage.getRecentLocations).not.toHaveBeenCalled();
    });

    it('should handle errors during batch validation gracefully', async () => {
      LocationStorage.getRecentLocations.mockRejectedValue(new Error('Storage error'));

      service.isOnline = true;

      // Should not throw
      await expect(
        service.validatePendingLocations('test-api-key')
      ).resolves.toBeUndefined();
    });
  });

  describe('App state transitions', () => {
    it('should validate pending locations when app comes to foreground', (done) => {
      service.start();
      const validateSpy = jest.spyOn(service, 'validatePendingLocations');

      // Simulate app coming to foreground
      const listeners = AppState.addEventListener.mock.calls;
      const appStateChangeListener = listeners.find(
        (call) => call[0] === 'change'
      )?.[1];

      if (appStateChangeListener) {
        appStateChangeListener('active');
        setTimeout(() => {
          expect(validateSpy).toHaveBeenCalled();
          done();
        }, 0);
      }
    });
  });

  describe('Online to offline transition', () => {
    it('should trigger validation when transitioning from offline to online', (done) => {
      service.start();
      const validateSpy = jest.spyOn(service, 'validatePendingLocations');

      service.isOnline = false;
      service.handleNetworkChange({ isConnected: true });

      setTimeout(() => {
        expect(validateSpy).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should not trigger validation when already online', (done) => {
      service.start();
      const validateSpy = jest.spyOn(service, 'validatePendingLocations');

      service.isOnline = true;
      service.handleNetworkChange({ isConnected: true });

      setTimeout(() => {
        expect(validateSpy).not.toHaveBeenCalled();
        done();
      }, 0);
    });
  });
});
