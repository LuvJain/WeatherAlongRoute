// @flow

import { NetInfo } from 'react-native';
import LocationStorage from './LocationStorage';
import type { Location, RecentLocation } from '../models/Location';

const GOOGLE_REVERSE_GEOCODING_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA';

/**
 * Callback type for online status changes
 */
type OnlineStatusCallback = (isOnline: boolean) => void;

/**
 * Callback type for location validation updates
 */
type LocationUpdateCallback = (location: Location) => void;

/**
 * LocationValidationService
 * Handles background validation of locations with pending validation status
 * Detects online/offline transitions and validates locations via reverse geocoding
 */
class LocationValidationServiceClass {
  isOnline: boolean = true;
  validatePendingLocationsIntervalId: ?number = null;
  onlineStatusCallbacks: OnlineStatusCallback[] = [];
  locationUpdateCallbacks: LocationUpdateCallback[] = [];

  /**
   * Initialize the service and start monitoring online/offline transitions
   */
  initialize(): void {
    // Subscribe to network state changes
    NetInfo.isConnected.addEventListener('change', this.handleConnectivityChange);

    // Check initial online status
    NetInfo.isConnected.fetch().then((isConnected) => {
      this.isOnline = isConnected;
      if (isConnected) {
        this.validatePendingLocations();
      }
    });

    // Start periodic validation every 5 seconds when online
    this.startPeriodicValidation();
  }

  /**
   * Handle connectivity change events
   */
  handleConnectivityChange = (isOnline: boolean): void => {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    // Notify all listeners of status change
    this.onlineStatusCallbacks.forEach((callback) => {
      callback(isOnline);
    });

    // When transitioning from offline to online, validate pending locations
    if (wasOffline && isOnline) {
      this.validatePendingLocations();
    }
  };

  /**
   * Start periodic validation of pending locations
   */
  startPeriodicValidation(): void {
    // Clear existing interval if any
    if (this.validatePendingLocationsIntervalId) {
      clearInterval(this.validatePendingLocationsIntervalId);
    }

    // Validate pending locations every 5 seconds
    this.validatePendingLocationsIntervalId = setInterval(() => {
      if (this.isOnline) {
        this.validatePendingLocations();
      }
    }, 5000);
  }

  /**
   * Validate all pending locations (validated: false)
   * Uses reverse geocoding to validate GPS coordinates
   */
  validatePendingLocations = async (): Promise<void> => {
    try {
      const recentLocations = await LocationStorage.getRecentLocations();

      // Filter locations that need validation (validated: false)
      const pendingLocations = recentLocations.filter(
        (loc) => !loc.validated
      );

      if (pendingLocations.length === 0) {
        return;
      }

      // Validate each pending location
      for (const location of pendingLocations) {
        try {
          await this.validateLocation(location);
        } catch (error) {
          // Log validation error but don't throw - continue with next location
          console.warn(
            `Failed to validate location ${location.id}:`,
            error
          );
        }
      }
    } catch (error) {
      // Log error but don't throw - validation failures shouldn't block app
      console.warn('Error validating pending locations:', error);
    }
  };

  /**
   * Validate a single location using reverse geocoding
   */
  validateLocation = async (location: Location): Promise<void> => {
    try {
      // Skip validation if location is already validated
      if (location.validated) {
        return;
      }

      // Use reverse geocoding to validate coordinates
      const address = await this.reverseGeocode(
        location.latitude,
        location.longitude
      );

      if (address) {
        // Update location with validated: true
        const validatedLocation: Location = {
          ...location,
          validated: true,
          address: address, // Update with reverse geocoded address
        };

        // Save updated location
        await LocationStorage.saveLocation(validatedLocation);

        // Notify listeners of update
        this.locationUpdateCallbacks.forEach((callback) => {
          callback(validatedLocation);
        });
      }
    } catch (error) {
      // Gracefully handle validation error without blocking
      console.warn(
        `Validation error for location ${location.id}:`,
        error
      );
      // Don't re-throw - allow other validations to continue
    }
  };

  /**
   * Perform reverse geocoding to get address from coordinates
   */
  reverseGeocode = async (
    latitude: number,
    longitude: number
  ): Promise<string | null> => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_REVERSE_GEOCODING_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (
        data.results &&
        data.results.length > 0 &&
        data.results[0].formatted_address
      ) {
        return data.results[0].formatted_address;
      }

      return null;
    } catch (error) {
      console.warn('Reverse geocoding error:', error);
      throw error;
    }
  };

  /**
   * Subscribe to online status changes
   */
  subscribeToOnlineStatus(callback: OnlineStatusCallback): () => void {
    this.onlineStatusCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.onlineStatusCallbacks = this.onlineStatusCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Subscribe to location update notifications
   */
  subscribeToLocationUpdates(callback: LocationUpdateCallback): () => void {
    this.locationUpdateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.locationUpdateCallbacks = this.locationUpdateCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Get current online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Cleanup - stop listening and clear intervals
   */
  cleanup(): void {
    if (this.validatePendingLocationsIntervalId) {
      clearInterval(this.validatePendingLocationsIntervalId);
    }
    NetInfo.isConnected.removeEventListener('change', this.handleConnectivityChange);
    this.onlineStatusCallbacks = [];
    this.locationUpdateCallbacks = [];
  }
}

// Singleton instance
const LocationValidationService = new LocationValidationServiceClass();

export default LocationValidationService;
