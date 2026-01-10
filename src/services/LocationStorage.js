// @flow

import { AsyncStorage } from 'react-native';
import type { Location, RecentLocation } from '../models/Location';

const STORAGE_KEY = '@WeatherAlongRoute:recentLocations';
const MAX_RECENT_ITEMS = 20;

/**
 * LocationStorage service
 * Handles persistence of locations to AsyncStorage with deduplication
 */
class LocationStorageService {
  /**
   * Save a location to recent locations
   * If location already exists, increment frequency counter
   * Keep max 20 most recent unique locations
   */
  async saveLocation(location: Location): Promise<void> {
    try {
      const recentLocations = await this.getRecentLocations();

      // Check if location already exists by matching address and coordinates
      const existingIndex = recentLocations.findIndex(
        (loc) =>
          loc.address === location.address &&
          loc.latitude === location.latitude &&
          loc.longitude === location.longitude
      );

      if (existingIndex !== -1) {
        // Increment frequency counter and update timestamp
        recentLocations[existingIndex].frequency += 1;
        recentLocations[existingIndex].timestamp = Date.now();
        // Move to front
        const [updated] = recentLocations.splice(existingIndex, 1);
        recentLocations.unshift(updated);
      } else {
        // Add new location with frequency 1 at the front
        const newRecentLocation: RecentLocation = {
          ...location,
          frequency: 1,
        };
        recentLocations.unshift(newRecentLocation);
      }

      // Keep only max 20 items
      const trimmedLocations = recentLocations.slice(0, MAX_RECENT_ITEMS);

      // Persist to AsyncStorage
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(trimmedLocations)
      );
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  }

  /**
   * Retrieve all recent locations from AsyncStorage
   */
  async getRecentLocations(): Promise<RecentLocation[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error retrieving recent locations:', error);
      throw error;
    }
  }

  /**
   * Delete a location by id
   */
  async deleteLocation(locationId: string): Promise<void> {
    try {
      const recentLocations = await this.getRecentLocations();
      const filteredLocations = recentLocations.filter(
        (loc) => loc.id !== locationId
      );

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(filteredLocations)
      );
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }

  /**
   * Clear all recent locations
   */
  async clearAllLocations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing locations:', error);
      throw error;
    }
  }

  /**
   * Get location by id
   */
  async getLocationById(locationId: string): Promise<RecentLocation | null> {
    try {
      const recentLocations = await this.getRecentLocations();
      return recentLocations.find((loc) => loc.id === locationId) || null;
    } catch (error) {
      console.error('Error retrieving location by id:', error);
      throw error;
    }
  }
}

export default new LocationStorageService();
