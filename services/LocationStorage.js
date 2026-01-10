// @flow

import { AsyncStorage } from 'react-native';
import type { Location, RecentLocation } from '../models/Location';

const STORAGE_KEY = 'recent_locations';
const MAX_RECENT_LOCATIONS = 20;

/**
 * LocationStorage service manages persisting and retrieving locations
 * from AsyncStorage with support for frequency tracking and duplicate detection.
 */
class LocationStorage {
  /**
   * Saves a location to AsyncStorage. If the location already exists (by coordinates),
   * increments its frequency counter instead of creating a duplicate.
   * Maintains max 20 recent locations sorted by frequency.
   *
   * @param location - The Location object to save
   * @returns Promise that resolves when the location is saved
   */
  static async saveLocation(location: Location): Promise<void> {
    try {
      const recentLocations = await this.getRecentLocations();

      // Check if location already exists (by latitude/longitude)
      const existingIndex = recentLocations.findIndex(
        loc => loc.latitude === location.latitude && loc.longitude === location.longitude
      );

      if (existingIndex !== -1) {
        // Increment frequency for existing location
        recentLocations[existingIndex].frequency += 1;
        recentLocations[existingIndex].timestamp = Date.now();
      } else {
        // Add new location with frequency 1
        const newRecentLocation: RecentLocation = {
          ...location,
          frequency: 1,
        };
        recentLocations.push(newRecentLocation);
      }

      // Sort by frequency (descending) and keep only top 20
      recentLocations.sort((a, b) => b.frequency - a.frequency);
      const trimmedLocations = recentLocations.slice(0, MAX_RECENT_LOCATIONS);

      // Persist to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedLocations));
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  }

  /**
   * Retrieves all recent locations from AsyncStorage.
   *
   * @returns Promise that resolves with an array of RecentLocation objects
   */
  static async getRecentLocations(): Promise<RecentLocation[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data === null) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error retrieving recent locations:', error);
      return [];
    }
  }

  /**
   * Retrieves a specific location by ID.
   *
   * @param id - The location ID to retrieve
   * @returns Promise that resolves with the Location or null if not found
   */
  static async getLocationById(id: string): Promise<RecentLocation | null> {
    try {
      const recentLocations = await this.getRecentLocations();
      const location = recentLocations.find(loc => loc.id === id);
      return location || null;
    } catch (error) {
      console.error('Error retrieving location by ID:', error);
      return null;
    }
  }

  /**
   * Deletes a location by ID.
   *
   * @param id - The location ID to delete
   * @returns Promise that resolves when the location is deleted
   */
  static async deleteLocation(id: string): Promise<void> {
    try {
      const recentLocations = await this.getRecentLocations();
      const filteredLocations = recentLocations.filter(loc => loc.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLocations));
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }

  /**
   * Deletes all recent locations from storage.
   *
   * @returns Promise that resolves when all locations are cleared
   */
  static async clearAllLocations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing locations:', error);
      throw error;
    }
  }

  /**
   * Gets the frequency count of a specific location.
   *
   * @param id - The location ID
   * @returns Promise that resolves with the frequency count or 0 if not found
   */
  static async getLocationFrequency(id: string): Promise<number> {
    try {
      const location = await this.getLocationById(id);
      return location ? location.frequency : 0;
    } catch (error) {
      console.error('Error getting location frequency:', error);
      return 0;
    }
  }
}

export default LocationStorage;
