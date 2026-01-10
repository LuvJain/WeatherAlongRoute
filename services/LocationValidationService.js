// @flow

import { NetInfo } from 'react-native';
import type { Location } from '../models/Location';
import LocationStorage from './LocationStorage';

/**
 * LocationValidationService manages background validation of locations
 * Detects online/offline transitions and validates pending locations
 */
export class LocationValidationService {
  static isOnline: boolean = true;
  static pendingLocations: Array<Location> = [];
  static validationInProgress: boolean = false;
  static listeners: Array<(isOnline: boolean) => void> = [];

  /**
   * Initialize the validation service and set up online/offline detection
   */
  static async initialize(): Promise<void> {
    try {
      // Set up network state listener for online/offline transitions
      NetInfo.addEventListener('connectionChange', (state) => {
        this.handleConnectionChange(state);
      });

      // Get initial online status
      const initialState = await NetInfo.fetch();
      this.isOnline = initialState.isConnected || false;
    } catch (error) {
      console.warn('Error initializing LocationValidationService:', error);
      // Default to online if we can't determine state
      this.isOnline = true;
    }
  }

  /**
   * Handle online/offline state transitions
   */
  static handleConnectionChange = (state: any): void => {
    const newOnlineStatus = state.isConnected || false;

    // If we transitioned from offline to online
    if (!this.isOnline && newOnlineStatus) {
      this.isOnline = true;
      console.log('Device came online, validating pending locations');
      this.validatePendingLocations();
    } else if (this.isOnline && !newOnlineStatus) {
      this.isOnline = false;
      console.log('Device went offline');
    }

    // Notify all listeners of state change
    this.listeners.forEach((listener) => listener(this.isOnline));
  };

  /**
   * Subscribe to online/offline state changes
   */
  static subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Add a location to the pending validation queue
   */
  static async addPendingLocation(location: Location): Promise<void> {
    try {
      // Check if location already exists in pending queue
      const exists = this.pendingLocations.some((loc) => loc.id === location.id);
      if (!exists) {
        this.pendingLocations.push(location);
      }

      // If we're online, validate immediately
      if (this.isOnline) {
        await this.validatePendingLocations();
      }
    } catch (error) {
      console.warn('Error adding pending location:', error);
    }
  }

  /**
   * Validate all pending locations by attempting geocoding
   */
  static async validatePendingLocations(): Promise<void> {
    if (this.validationInProgress || this.pendingLocations.length === 0) {
      return;
    }

    this.validationInProgress = true;
    const locationsToValidate = [...this.pendingLocations];
    this.pendingLocations = [];

    try {
      for (const location of locationsToValidate) {
        const validated = await this.validateLocation(location);
        if (validated) {
          // Update location in storage with validated flag
          await this.updateLocationValidation(location);
        } else {
          // Re-add to pending queue if validation failed
          this.pendingLocations.push(location);
        }
      }
    } catch (error) {
      console.warn('Error during batch validation:', error);
      // Re-add failed locations to pending queue
      this.pendingLocations = [...this.pendingLocations, ...locationsToValidate];
    } finally {
      this.validationInProgress = false;
    }
  }

  /**
   * Validate a single location using reverse geocoding
   */
  static async validateLocation(location: Location): Promise<boolean> {
    try {
      if (location.validated) {
        return true; // Already validated
      }

      // Attempt reverse geocoding to validate coordinates
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA`
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Error validating location:', error);
      return false;
    }
  }

  /**
   * Update location validation status in storage
   */
  static async updateLocationValidation(location: Location): Promise<void> {
    try {
      const recentLocations = await LocationStorage.getRecentLocations();

      // Find and update the location
      const updatedLocations = recentLocations.map((item) => {
        if (item.id === location.id) {
          return {
            ...item,
            location: {
              ...item.location,
              validated: true,
            },
          };
        }
        return item;
      });

      // Save updated locations
      await LocationStorage.saveLocation({
        ...location,
        validated: true,
      });
    } catch (error) {
      console.warn('Error updating location validation:', error);
    }
  }

  /**
   * Get current online status
   */
  static getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Get pending locations count
   */
  static getPendingLocationsCount(): number {
    return this.pendingLocations.length;
  }

  /**
   * Clear all pending locations
   */
  static clearPendingLocations(): void {
    this.pendingLocations = [];
  }

  /**
   * Reset the service (for testing or cleanup)
   */
  static reset(): void {
    this.pendingLocations = [];
    this.validationInProgress = false;
    this.listeners = [];
    this.isOnline = true;
  }
}

export default LocationValidationService;
