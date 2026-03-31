// @flow

import { NetInfo } from 'react-native';
import { LocationStorageService } from './LocationStorage';
import type { Location } from '../models/Location';

/**
 * Geocoding response type from Google Maps API
 */
type GeocodingResult = {
  formatted_address: string,
  geometry: {
    location: {
      lat: number,
      lng: number
    }
  }
};

type NetworkChangeListener = (isConnected: boolean) => void;

const GOOGLE_MAPS_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA';
const VALIDATION_RETRY_INTERVAL = 30000; // 30 seconds

/**
 * LocationValidationService
 * Manages background validation of locations with online/offline detection
 * Validates locations that were saved offline when connection is restored
 */
export class LocationValidationService {
  static instance: ?LocationValidationService;
  isOnline: boolean = true;
  validationInterval: ?IntervalID;
  networkChangeListener: ?NetworkChangeListener;
  pendingValidations: Array<string> = [];

  /**
   * Get singleton instance
   */
  static getInstance(): LocationValidationService {
    if (!LocationValidationService.instance) {
      LocationValidationService.instance = new LocationValidationService();
    }
    return LocationValidationService.instance;
  }

  /**
   * Start the validation service
   * Sets up network monitoring and begins periodic validation checks
   */
  async start(): Promise<void> {
    try {
      // Check initial network status
      await this._checkNetworkStatus();

      // Set up network change listener
      this._setupNetworkListener();

      // Start periodic validation of pending locations
      this._startValidationLoop();

      console.log('LocationValidationService started');
    } catch (error) {
      console.error('Error starting LocationValidationService:', error);
    }
  }

  /**
   * Stop the validation service
   * Cleans up listeners and timers
   */
  stop(): void {
    try {
      if (this.networkChangeListener && NetInfo.isConnected) {
        NetInfo.isConnected.removeEventListener('change', this.networkChangeListener);
      }

      if (this.validationInterval) {
        clearInterval(this.validationInterval);
        this.validationInterval = null;
      }

      console.log('LocationValidationService stopped');
    } catch (error) {
      console.error('Error stopping LocationValidationService:', error);
    }
  }

  /**
   * Check current network status
   */
  async _checkNetworkStatus(): Promise<void> {
    try {
      const isConnected = await NetInfo.isConnected.fetch();
      this.isOnline = isConnected;

      // If coming online, validate pending locations
      if (isConnected) {
        await this._validatePendingLocations();
      }
    } catch (error) {
      // Default to offline if check fails
      this.isOnline = false;
      console.error('Error checking network status:', error);
    }
  }

  /**
   * Set up network change listener
   */
  _setupNetworkListener(): void {
    try {
      if (NetInfo.isConnected) {
        this.networkChangeListener = async (isConnected: boolean) => {
          const wasOnline = this.isOnline;
          this.isOnline = isConnected;

          // When coming online, validate pending locations
          if (!wasOnline && isConnected) {
            await this._validatePendingLocations();
          }
        };

        NetInfo.isConnected.addEventListener('change', this.networkChangeListener);
      }
    } catch (error) {
      console.error('Error setting up network listener:', error);
    }
  }

  /**
   * Start periodic validation loop
   */
  _startValidationLoop(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }

    this.validationInterval = setInterval(() => {
      if (this.isOnline) {
        this._validatePendingLocations().catch(error => {
          console.error('Error in validation loop:', error);
        });
      }
    }, VALIDATION_RETRY_INTERVAL);
  }

  /**
   * Validate all pending locations
   * Updates locations with validated: false to validated: true after successful geocoding
   */
  async _validatePendingLocations(): Promise<void> {
    try {
      const recentLocations = await LocationStorageService.getRecentLocations();

      // Filter locations that need validation (validated: false)
      const locationsToValidate = recentLocations
        .filter(item => !item.location.validated)
        .map(item => item.location);

      if (locationsToValidate.length === 0) {
        return;
      }

      console.log(`Validating ${locationsToValidate.length} pending locations`);

      // Validate each location
      for (const location of locationsToValidate) {
        try {
          await this._validateLocation(location);
        } catch (error) {
          console.error(`Error validating location ${location.id}:`, error);
          // Continue with next location instead of throwing
        }
      }
    } catch (error) {
      console.error('Error validating pending locations:', error);
      // Don't throw - handle gracefully
    }
  }

  /**
   * Validate a single location using reverse geocoding
   * Updates the location's validated flag if successful
   */
  async _validateLocation(location: Location): Promise<void> {
    try {
      if (!this.isOnline) {
        return;
      }

      // Check if location is already in validation queue to avoid duplicates
      if (this.pendingValidations.includes(location.id)) {
        return;
      }

      this.pendingValidations.push(location.id);

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // Successfully geocoded - update location
        const result: GeocodingResult = data.results[0];
        const validatedLocation: Location = {
          ...location,
          validated: true,
          address: result.formatted_address
        };

        // Update in storage
        await LocationStorageService.saveLocation(validatedLocation);
        console.log(`Location ${location.id} validated successfully`);
      } else {
        console.warn(`Geocoding failed for location ${location.id}: ${data.status}`);
      }

      // Remove from pending queue
      this.pendingValidations = this.pendingValidations.filter(id => id !== location.id);
    } catch (error) {
      console.error(`Error validating location ${location.id}:`, error);
      // Remove from pending queue on error
      this.pendingValidations = this.pendingValidations.filter(id => id !== location.id);
      // Don't throw - handle gracefully
    }
  }

  /**
   * Manually validate a location
   * Can be called when needed for a specific location
   */
  async validateLocation(location: Location): Promise<Location> {
    try {
      if (!location.validated && this.isOnline) {
        await this._validateLocation(location);
      }

      // Return updated location from storage if validation was successful
      const updated = await LocationStorageService.getLocationById(location.id);
      return updated || location;
    } catch (error) {
      console.error(`Error manually validating location ${location.id}:`, error);
      return location;
    }
  }

  /**
   * Check if app is currently online
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }
}

export default LocationValidationService;
