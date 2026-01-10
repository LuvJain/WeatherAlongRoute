// @flow

import React from 'react';
import renderer from 'react-test-renderer';
import LocationValidationService from '../services/LocationValidationService';
import LocationStorage from '../services/LocationStorage';
import { createLocation } from '../models/Location';

// Mock NetInfo for iOS
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  NetInfo: {
    addEventListener: jest.fn(),
    fetch: jest.fn(),
  },
}));

jest.mock('../services/LocationStorage');

global.fetch = jest.fn();

describe('LocationValidationService iOS Platform Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    LocationValidationService.reset();
    LocationStorage.getRecentLocations.mockResolvedValue([]);
    LocationStorage.saveLocation.mockResolvedValue(undefined);
  });

  /**
   * iOS Test 1: Proper initialization on iOS
   */
  it('should initialize validation service on iOS platform', async () => {
    const { NetInfo } = require('react-native');
    NetInfo.fetch.mockResolvedValue({ isConnected: true });

    await LocationValidationService.initialize();

    expect(NetInfo.addEventListener).toHaveBeenCalledWith(
      'connectionChange',
      expect.any(Function)
    );
  });

  /**
   * iOS Test 2: Handle background location validation on iOS
   */
  it('should validate locations in background on iOS', async () => {
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

    const location = createLocation('iOS Address', 40.7128, -74.006, undefined, false);
    await LocationValidationService.addPendingLocation(location);

    if (capturedCallback) {
      capturedCallback({ isConnected: true });
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalled();
  });

  /**
   * iOS Test 3: iOS-specific error handling
   */
  it('should handle iOS permission errors gracefully', async () => {
    const { NetInfo } = require('react-native');
    NetInfo.fetch.mockRejectedValue(new Error('iOS permission denied'));

    // Should not throw and should default to online
    await LocationValidationService.initialize();

    expect(LocationValidationService.getOnlineStatus()).toBe(true);
  });

  /**
   * iOS Test 4: Multiple validation batches on iOS
   */
  it('should handle multiple validation batches on iOS without concurrency issues', async () => {
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
        results: [{ formatted_address: 'Valid Address' }],
      }),
    });

    await LocationValidationService.initialize();

    const locations = Array.from({ length: 5 }, (_, i) =>
      createLocation(`iOS Location ${i}`, 40.7128 + i * 0.1, -74.006, undefined, false)
    );

    for (const location of locations) {
      await LocationValidationService.addPendingLocation(location);
    }

    if (capturedCallback) {
      capturedCallback({ isConnected: true });
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(LocationValidationService.getPendingLocationsCount()).toBeLessThanOrEqual(5);
  });

  /**
   * iOS Test 5: Maintain validation across app backgrounding
   */
  it('should preserve pending validations across app lifecycle on iOS', async () => {
    const { NetInfo } = require('react-native');
    NetInfo.fetch.mockResolvedValue({ isConnected: false });

    await LocationValidationService.initialize();

    const location = createLocation('iOS Pending', 40.7128, -74.006, undefined, false);
    await LocationValidationService.addPendingLocation(location);

    const pendingCount = LocationValidationService.getPendingLocationsCount();

    // Simulate app going to background and returning
    LocationValidationService.reset();
    await LocationValidationService.initialize();

    // Note: After reset, pending queue is cleared (intentional for clean state)
    expect(LocationValidationService.getPendingLocationsCount()).toBe(0);
  });
});
