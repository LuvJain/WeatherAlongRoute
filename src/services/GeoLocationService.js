/**
 * GeoLocationService.js
 * Service for handling browser geolocation API interactions and permissions
 */

import AsyncStorage from '@react-native-community/async-storage';
import { Platform } from 'react-native';

// Constants for AsyncStorage keys
const STORAGE_KEYS = {
  GEO_PREFERENCES: 'weather_app_geo_preferences',
  GEO_LAST_LOCATION: 'weather_app_last_location',
};

// Enum for user's geolocation preferences
export const GEO_PREFERENCES = {
  ENABLED: 'enabled',         // User has explicitly enabled geolocation
  DISABLED: 'disabled',       // User has explicitly disabled geolocation
  DENIED: 'denied',           // Browser denied permission (user choice)
  UNAVAILABLE: 'unavailable', // Geolocation is not available on device
  UNSET: 'unset',             // User hasn't made a choice yet
};

class GeoLocationService {
  constructor() {
    this.isGeolocationAvailable = typeof navigator !== 'undefined' && 'geolocation' in navigator;
    this.currentPermissionStatus = null;
  }

  /**
   * Check if geolocation is supported in the current environment
   * @returns {boolean} - True if geolocation is available
   */
  isSupported() {
    return this.isGeolocationAvailable;
  }

  /**
   * Check and load the user's saved geolocation preferences
   * @returns {Promise<string>} - The user's preference (from GEO_PREFERENCES enum)
   */
  async getUserPreference() {
    try {
      const savedPreference = await AsyncStorage.getItem(STORAGE_KEYS.GEO_PREFERENCES);
      return savedPreference || GEO_PREFERENCES.UNSET;
    } catch (error) {
      console.error('Failed to load geolocation preferences:', error);
      return GEO_PREFERENCES.UNSET;
    }
  }

  /**
   * Save the user's geolocation preference
   * @param {string} preference - The preference to save (from GEO_PREFERENCES enum)
   * @returns {Promise<void>}
   */
  async saveUserPreference(preference) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GEO_PREFERENCES, preference);
    } catch (error) {
      console.error('Failed to save geolocation preference:', error);
    }
  }

  /**
   * Save the user's last known location
   * @param {Object} location - The location object
   * @param {number} location.latitude - Latitude
   * @param {number} location.longitude - Longitude
   * @param {string} location.timestamp - Timestamp
   * @returns {Promise<void>}
   */
  async saveLastLocation(location) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.GEO_LAST_LOCATION,
        JSON.stringify({
          ...location,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('Failed to save last location:', error);
    }
  }

  /**
   * Get the user's last known location
   * @param {number} maxAgeInHours - Maximum age of the cached location in hours
   * @returns {Promise<Object|null>} - The location object or null
   */
  async getLastLocation(maxAgeInHours = 24) {
    try {
      const savedLocationJson = await AsyncStorage.getItem(STORAGE_KEYS.GEO_LAST_LOCATION);

      if (!savedLocationJson) {
        return null;
      }

      const savedLocation = JSON.parse(savedLocationJson);
      const savedTime = new Date(savedLocation.savedAt).getTime();
      const currentTime = new Date().getTime();
      const hoursDifference = (currentTime - savedTime) / (1000 * 60 * 60);

      // If location is older than maxAgeInHours, consider it stale
      if (hoursDifference > maxAgeInHours) {
        return null;
      }

      return savedLocation;
    } catch (error) {
      console.error('Failed to get last location:', error);
      return null;
    }
  }

  /**
   * Clear saved location data
   * @returns {Promise<void>}
   */
  async clearLocationData() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.GEO_LAST_LOCATION);
    } catch (error) {
      console.error('Failed to clear location data:', error);
    }
  }

  /**
   * Request the user's current geolocation
   * @param {Object} options - Geolocation options
   * @param {boolean} options.enableHighAccuracy - Whether to enable high accuracy
   * @param {number} options.timeout - Timeout in milliseconds
   * @param {number} options.maximumAge - Maximum age of a cached position in milliseconds
   * @returns {Promise<Object>} - Object containing coordinates
   */
  getCurrentPosition(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60 * 60 * 1000, // 1 hour
    };

    const geolocationOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      if (!this.isGeolocationAvailable) {
        this.saveUserPreference(GEO_PREFERENCES.UNAVAILABLE);
        reject(new Error('Geolocation is not available on this device or browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          // Save the location and preference
          this.saveLastLocation(location);
          this.saveUserPreference(GEO_PREFERENCES.ENABLED);

          resolve(location);
        },
        (error) => {
          let preferenceToSave;

          switch (error.code) {
            case 1: // PERMISSION_DENIED
              preferenceToSave = GEO_PREFERENCES.DENIED;
              error.message = 'Location permission denied. Please enable location services for this app.';
              break;
            case 2: // POSITION_UNAVAILABLE
              error.message = 'Location information is currently unavailable. Please try again later.';
              break;
            case 3: // TIMEOUT
              error.message = 'Location request timed out. Please check your connection and try again.';
              break;
            default:
              error.message = 'An unknown error occurred while retrieving your location.';
          }

          if (preferenceToSave) {
            this.saveUserPreference(preferenceToSave);
          }

          reject(error);
        },
        geolocationOptions
      );
    });
  }

  /**
   * Convert location coordinates to OpenWeatherMap API parameters
   * @param {Object} location - Location object with coordinates
   * @returns {Object} - Parameters for OpenWeatherMap API
   */
  locationToApiParams(location) {
    return {
      lat: location.latitude,
      lon: location.longitude,
    };
  }
}

// Export as singleton
export default new GeoLocationService();