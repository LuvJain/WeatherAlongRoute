// @flow
import { AppState, NetInfo } from 'react-native';
import LocationStorage from './LocationStorage';
import type { Location, RecentLocation } from '../models/types';

/**
 * LocationValidationService
 * Handles background validation of pending locations
 * Detects online/offline transitions and validates locations
 */
class LocationValidationService {
  static instance: ?LocationValidationService = null;
  appState: string = AppState.currentState;
  isOnline: boolean = true;
  isValidating: boolean = false;
  validationListeners: Array<(isOnline: boolean) => void> = [];
  pendingLocations: Location[] = [];

  /**
   * Get singleton instance of LocationValidationService
   */
  static getInstance(): LocationValidationService {
    if (!LocationValidationService.instance) {
      LocationValidationService.instance = new LocationValidationService();
    }
    return LocationValidationService.instance;
  }

  /**
   * Initialize the service
   * Sets up app state and network listeners
   */
  start() {
    // Listen for app state changes (foreground/background)
    AppState.addEventListener('change', this.handleAppStateChange);

    // Listen for network connectivity changes
    if (NetInfo && NetInfo.addEventListener) {
      NetInfo.addEventListener('connectionChange', this.handleNetworkChange);
    }

    // Initial network status check
    this.checkOnlineStatus();
  }

  /**
   * Stop the service
   * Removes all listeners
   */
  stop() {
    AppState.removeEventListener('change', this.handleAppStateChange);

    if (NetInfo && NetInfo.removeEventListener) {
      NetInfo.removeEventListener('connectionChange', this.handleNetworkChange);
    }
  }

  /**
   * Handle app state changes
   */
  handleAppStateChange = (nextAppState: string) => {
    if (
      this.appState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to foreground - validate pending locations
      this.validatePendingLocations();
    }

    this.appState = nextAppState;
  };

  /**
   * Handle network connectivity changes
   */
  handleNetworkChange = (state: any) => {
    const wasOnline = this.isOnline;
    const isConnected = state?.isConnected || state?.type !== 'none';

    this.isOnline = isConnected;

    // Notify listeners of status change
    this.validationListeners.forEach((listener) => {
      listener(this.isOnline);
    });

    // If we transitioned from offline to online, validate pending locations
    if (!wasOnline && isConnected) {
      this.validatePendingLocations();
    }
  };

  /**
   * Check current online status
   */
  checkOnlineStatus = async () => {
    try {
      if (NetInfo && NetInfo.fetch) {
        const state = await NetInfo.fetch();
        const isConnected = state?.isConnected || state?.type !== 'none';
        this.isOnline = isConnected;
      } else {
        // Fallback: try to reach a simple endpoint
        const response = await fetch('https://www.google.com/', {
          method: 'HEAD',
          timeout: 5000
        });
        this.isOnline = response.ok;
      }
    } catch (error) {
      this.isOnline = false;
    }
  };

  /**
   * Validate a single location using reverse geocoding
   * Updates location with validated: true if successful
   */
  validateLocation = async (location: Location, googleApiKey: string): Promise<?Location> => {
    try {
      // Check if location is already validated
      if (location.validated) {
        return location;
      }

      // If offline, don't attempt validation
      if (!this.isOnline) {
        return null;
      }

      // Perform reverse geocoding using Google Maps API
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=${googleApiKey}`;

      const response = await fetch(url, {
        method: 'GET',
        timeout: 10000
      });

      if (!response.ok) {
        console.warn(`Validation failed for location: ${location.id}`);
        return null;
      }

      const data = await response.json();

      // Check if geocoding was successful
      if (data.results && data.results.length > 0) {
        const validatedLocation: Location = {
          ...location,
          validated: true,
          address: data.results[0].formatted_address || location.address
        };

        // Update location in storage
        try {
          const recentLocations = await LocationStorage.getRecentLocations();
          const index = recentLocations.findIndex((loc) => loc.id === location.id);

          if (index !== -1) {
            recentLocations[index] = {
              ...recentLocations[index],
              ...validatedLocation
            };
            await LocationStorage.updateLocation(validatedLocation);
          }
        } catch (storageError) {
          console.warn('Failed to update location in storage:', storageError);
        }

        return validatedLocation;
      }

      return null;
    } catch (error) {
      // Handle validation errors gracefully without blocking app
      console.warn(`Error validating location ${location.id}:`, error);
      return null;
    }
  };

  /**
   * Validate all pending locations
   */
  validatePendingLocations = async (googleApiKey: string = '') => {
    if (this.isValidating) {
      return; // Already validating
    }

    this.isValidating = true;

    try {
      // Get all recent locations
      const recentLocations = await LocationStorage.getRecentLocations();

      // Filter pending locations (validated: false)
      const pendingLocations = recentLocations.filter((loc) => !loc.validated);

      if (pendingLocations.length === 0) {
        this.isValidating = false;
        return;
      }

      // Validate each pending location
      for (const location of pendingLocations) {
        await this.validateLocation(location, googleApiKey);
        // Add small delay to avoid rate limiting
        await this.delay(100);
      }
    } catch (error) {
      // Handle errors gracefully
      console.warn('Error validating pending locations:', error);
    } finally {
      this.isValidating = false;
    }
  };

  /**
   * Update a location in storage
   */
  updateLocation = async (location: Location): Promise<void> => {
    try {
      const recentLocations = await LocationStorage.getRecentLocations();
      const index = recentLocations.findIndex((loc) => loc.id === location.id);

      if (index !== -1) {
        const updated = {
          ...recentLocations[index],
          ...location
        };
        recentLocations[index] = updated;
        await LocationStorage.setAllLocations(recentLocations);
      }
    } catch (error) {
      console.warn('Error updating location:', error);
    }
  };

  /**
   * Add a listener for online status changes
   */
  addOnlineStatusListener(listener: (isOnline: boolean) => void): () => void {
    this.validationListeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.validationListeners = this.validationListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get current online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Simple delay utility
   */
  delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
}

export default LocationValidationService;
