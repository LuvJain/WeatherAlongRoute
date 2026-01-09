// @flow

import { AsyncStorage } from 'react-native';
import type { Location, RecentLocation } from '../models/Location';

const RECENT_LOCATIONS_KEY = '@WeatherAlongRoute:recentLocations';
const MAX_RECENT_LOCATIONS = 20;

class LocationStorage {
  /**
   * Save a location to recent locations
   * If location already exists, increment frequency counter
   * Maintains max 20 recent items
   */
  static async saveLocation(location: Location): Promise<RecentLocation[]> {
    try {
      const recentLocations = await this.getRecentLocations();

      // Check if location already exists
      const existingIndex = recentLocations.findIndex(
        (loc) => loc.latitude === location.latitude &&
                 loc.longitude === location.longitude
      );

      if (existingIndex !== -1) {
        // Increment frequency counter for duplicate
        recentLocations[existingIndex].frequency += 1;
        recentLocations[existingIndex].timestamp = Date.now();
      } else {
        // Add new location with frequency of 1
        const newRecentLocation: RecentLocation = {
          ...location,
          frequency: 1,
        };
        recentLocations.unshift(newRecentLocation);
      }

      // Keep only max 20 items
      const trimmedLocations = recentLocations.slice(0, MAX_RECENT_LOCATIONS);

      await AsyncStorage.setItem(
        RECENT_LOCATIONS_KEY,
        JSON.stringify(trimmedLocations)
      );

      return trimmedLocations;
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  }

  /**
   * Retrieve all recent locations
   */
  static async getRecentLocations(): Promise<RecentLocation[]> {
    try {
      const data = await AsyncStorage.getItem(RECENT_LOCATIONS_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Error retrieving recent locations:', error);
      throw error;
    }
  }

  /**
   * Delete a location by id
   */
  static async deleteLocation(locationId: string): Promise<RecentLocation[]> {
    try {
      const recentLocations = await this.getRecentLocations();
      const filtered = recentLocations.filter((loc) => loc.id !== locationId);

      await AsyncStorage.setItem(
        RECENT_LOCATIONS_KEY,
        JSON.stringify(filtered)
      );

      return filtered;
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }

  /**
   * Clear all recent locations
   */
  static async clearAllLocations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(RECENT_LOCATIONS_KEY);
    } catch (error) {
      console.error('Error clearing locations:', error);
      throw error;
    }
  }

  /**
   * Get location by id
   */
  static async getLocationById(locationId: string): Promise<?RecentLocation> {
    try {
      const recentLocations = await this.getRecentLocations();
      return recentLocations.find((loc) => loc.id === locationId);
    } catch (error) {
      console.error('Error getting location by id:', error);
      throw error;
    }
  }
}

export default LocationStorage;
