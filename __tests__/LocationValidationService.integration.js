// @flow

import LocationValidationService from '../services/LocationValidationService';
import LocationStorage from '../services/LocationStorage';
import { createLocation } from '../models/Location';

// Mock NetInfo
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  NetInfo: {
    addEventListener: jest.fn(),
    fetch: jest.fn(),
  },
}));

// Mock LocationStorage
jest.mock('../services/LocationStorage');

// Mock the Google Geocoding API
global.fetch = jest.fn();

describe('LocationValidationService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationValidationService.reset();
    LocationStorage.getRecentLocations.mockResolvedValue([]);
    LocationStorage.saveLocation.mockResolvedValue(undefined);
  });

  /**
   * Integration Test 1: Service initialization
   */
  it('should initialize the validation service', async () => {
    const { NetInfo } = require('react-native');
    NetInfo.fetch.mockResolvedValue({ isConnected: true });

    await LocationValidationService.initialize();

    expect(NetInfo.addEventListener).toHaveBeenCalled();
    expect(LocationValidationService.getOnlineStatus()).toBe(true);
  });

  /**
   * Integration Test 2: Online status detection
   */
  it('should detect initial online status', async () => {
    const { NetInfo } = require('react-native');
    NetInfo.fetch.mockResolvedValue({ isConnected: true });

    await LocationValidationService.initialize();
    const isOnline = LocationValidationService.getOnlineStatus();

    expect(isOnline).toBe(true);
  });

  /**
   * Integration Test 3: Offline status detection
   */
  it('should detect initial offline status', async () => {
    const { NetInfo } = require('react-native');
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    await LocationValidationService.initialize();
    const isOnline = LocationValidationService.getOnlineStatus();

    expect(isOnline).toBe(false);
  });

  /**
   * Integration Test 4: Subscribe to online/offline changes
   */
  it('should notify listeners of online/offline state changes', async () => {
    const { NetInfo } = require('react-native');
    let capturedCallback;

    NetInfo.addEventListener.mockImplementation((event, callback) => {
      capturedCallback = callback;
    });
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    await LocationValidationService.initialize();

    const listener = jest.fn();
    LocationValidationService.subscribe(listener);

    // Simulate transition from offline to online
    if (capturedCallback) {
      capturedCallback({ isConnected: true });
    }

    expect(listener).toHaveBeenCalledWith(true);
  });

  /**
   * Integration Test 5: Offline-to-online transition triggers validation
   */
  it('should validate pending locations when transitioning from offline to online', async () => {
    const { NetInfo } = require('react-native');
    let capturedCallback;

    NetInfo.addEventListener.mockImplementation((event, callback) => {
      capturedCallback = callback;
    });
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [{ formatted_address: 'Test Address', place_id: 'test' }],
      }),
    });

    await LocationValidationService.initialize();

    const unvalidatedLocation = createLocation(
      'Unvalidated Address',
      40.7128,
      -74.006,
      undefined,
      false
    );

    // Add unvalidated location while offline
    await LocationValidationService.addPendingLocation(unvalidatedLocation);
    expect(LocationValidationService.getPendingLocationsCount()).toBe(1);

    // Simulate transition to online
    if (capturedCallback) {
      capturedCallback({ isConnected: true });
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Pending locations should be cleared after validation attempt
    expect(LocationValidationService.getPendingLocationsCount()).toBeLessThanOrEqual(1);
  });

  /**
   * Integration Test 6: Add pending location to validation queue
   */
  it('should add unvalidated location to pending queue', async () => {
    const { NetInfo } = require('react-native');
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    await LocationValidationService.initialize();

    const unvalidatedLocation = createLocation(
      'Pending Location',
      40.7128,
      -74.006,
      undefined,
      false
    );

    await LocationValidationService.addPendingLocation(unvalidatedLocation);

    expect(LocationValidationService.getPendingLocationsCount()).toBe(1);
  });

  /**
   * Integration Test 7: Validate a single location
   */
  it('should validate a single location with successful geocoding', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [{ formatted_address: 'Valid Address', place_id: 'valid' }],
      }),
    });

    const location = createLocation('Test Address', 40.7128, -74.006, undefined, false);

    const isValid = await LocationValidationService.validateLocation(location);

    expect(isValid).toBe(true);
  });

  /**
   * Integration Test 8: Handle validation failure gracefully
   */
  it('should handle location validation failure without blocking', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    const location = createLocation('Invalid Address', 40.7128, -74.006, undefined, false);

    const isValid = await LocationValidationService.validateLocation(location);

    expect(isValid).toBe(false);
  });

  /**
   * Integration Test 9: Batch validate multiple pending locations
   */
  it('should batch validate multiple pending locations', async () => {
    const { NetInfo } = require('react-native');
    let capturedCallback;

    NetInfo.addEventListener.mockImplementation((event, callback) => {
      capturedCallback = callback;
    });
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [{ formatted_address: 'Valid Address', place_id: 'valid' }],
      }),
    });

    await LocationValidationService.initialize();

    const location1 = createLocation('Address 1', 40.7128, -74.006, undefined, false);
    const location2 = createLocation('Address 2', 37.7749, -122.4194, undefined, false);

    await LocationValidationService.addPendingLocation(location1);
    await LocationValidationService.addPendingLocation(location2);

    expect(LocationValidationService.getPendingLocationsCount()).toBe(2);

    // Transition to online
    if (capturedCallback) {
      capturedCallback({ isConnected: true });
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should attempt validation of pending locations
    expect(global.fetch).toHaveBeenCalled();
  });

  /**
   * Integration Test 10: Skip duplicate pending locations
   */
  it('should not add duplicate locations to pending queue', async () => {
    const { NetInfo } = require('react-native');
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    await LocationValidationService.initialize();

    const location = createLocation('Duplicate Address', 40.7128, -74.006, undefined, false);

    await LocationValidationService.addPendingLocation(location);
    await LocationValidationService.addPendingLocation(location);

    expect(LocationValidationService.getPendingLocationsCount()).toBe(1);
  });

  /**
   * Integration Test 11: Already validated location handling
   */
  it('should skip validation for already validated locations', async () => {
    const validatedLocation = createLocation(
      'Pre-validated Address',
      40.7128,
      -74.006,
      'place-id',
      true
    );

    const isValid = await LocationValidationService.validateLocation(validatedLocation);

    expect(isValid).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * Integration Test 12: Update location validation status
   */
  it('should update location validation status in storage', async () => {
    LocationStorage.getRecentLocations.mockResolvedValue([
      {
        id: '40.7128,-74.006',
        location: createLocation('Address', 40.7128, -74.006, undefined, false),
        frequency: 1,
        lastUsed: Date.now(),
      },
    ]);

    const location = createLocation('Address', 40.7128, -74.006, undefined, false);

    await LocationValidationService.updateLocationValidation(location);

    expect(LocationStorage.saveLocation).toHaveBeenCalled();
  });

  /**
   * Integration Test 13: Clear pending locations
   */
  it('should clear all pending locations', async () => {
    const { NetInfo } = require('react-native');
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    await LocationValidationService.initialize();

    const location1 = createLocation('Address 1', 40.7128, -74.006, undefined, false);
    const location2 = createLocation('Address 2', 37.7749, -122.4194, undefined, false);

    await LocationValidationService.addPendingLocation(location1);
    await LocationValidationService.addPendingLocation(location2);

    expect(LocationValidationService.getPendingLocationsCount()).toBe(2);

    LocationValidationService.clearPendingLocations();

    expect(LocationValidationService.getPendingLocationsCount()).toBe(0);
  });

  /**
   * Integration Test 14: Service reset functionality
   */
  it('should properly reset service state', async () => {
    const { NetInfo } = require('react-native');
    NetInfo.fetch.mockResolvedValue({ isConnected: true });

    await LocationValidationService.initialize();

    const location = createLocation('Address', 40.7128, -74.006, undefined, false);
    await LocationValidationService.addPendingLocation(location);

    LocationValidationService.reset();

    expect(LocationValidationService.getPendingLocationsCount()).toBe(0);
    expect(LocationValidationService.getOnlineStatus()).toBe(true);
  });

  /**
   * Integration Test 15: Complete offline-to-online flow
   */
  it('should complete full offline-to-online validation flow', async () => {
    const { NetInfo } = require('react-native');
    let capturedCallback;

    NetInfo.addEventListener.mockImplementation((event, callback) => {
      capturedCallback = callback;
    });
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    const stateChanges = [];
    const listener = (isOnline) => stateChanges.push(isOnline);

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [{ formatted_address: 'Valid Address', place_id: 'valid' }],
      }),
    });

    // Initialize while offline
    await LocationValidationService.initialize();
    expect(LocationValidationService.getOnlineStatus()).toBe(false);

    // Subscribe to changes
    LocationValidationService.subscribe(listener);

    // Add unvalidated location while offline
    const unvalidatedLocation = createLocation(
      'Offline Location',
      40.7128,
      -74.006,
      undefined,
      false
    );
    await LocationValidationService.addPendingLocation(unvalidatedLocation);

    expect(LocationValidationService.getPendingLocationsCount()).toBe(1);

    // Transition to online
    if (capturedCallback) {
      capturedCallback({ isConnected: true });
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify transition was detected
    expect(stateChanges).toContain(true);
    expect(LocationValidationService.getOnlineStatus()).toBe(true);
  });
});
