// @flow
import { AsyncStorage } from 'react-native';
import type { Location, RecentLocation } from '../models/types';

const STORAGE_KEY = 'recent_locations';
const MAX_RECENT_ITEMS = 20;

/**
 * LocationStorage service
 * Handles persistence of locations to AsyncStorage with duplicate detection
 */
class LocationStorage {
  /**
   * Save a location to AsyncStorage
   * If location already exists (same coordinates), increment frequency instead of duplicating
   * @param location - Location object to save
   * @returns Promise<RecentLocation>
   */
  static async saveLocation(location: Location): Promise<RecentLocation> {
    try {
      const recentLocations = await this.getRecentLocations();
      const now = Date.now();

      // Check if location already exists
      const existingIndex = recentLocations.findIndex(
        (loc) => loc.latitude === location.latitude && loc.longitude === location.longitude
      );

      let recentLocation: RecentLocation;

      if (existingIndex !== -1) {
        // Location exists: increment frequency and update lastUsed
        const existing = recentLocations[existingIndex];
        recentLocation = {
          ...existing,
          frequency: existing.frequency + 1,
          lastUsed: now
        };
        // Move to end (most recent)
        recentLocations.splice(existingIndex, 1);
        recentLocations.push(recentLocation);
      } else {
        // New location: create with frequency 1
        recentLocation = {
          ...location,
          frequency: 1,
          lastUsed: now
        };
        recentLocations.push(recentLocation);

        // Remove oldest item if exceeding max size
        if (recentLocations.length > MAX_RECENT_ITEMS) {
          recentLocations.shift();
        }
      }

      // Persist to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recentLocations));
      return recentLocation;
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  }

  /**
   * Retrieve all recent locations from AsyncStorage
   * @returns Promise<RecentLocation[]>
   */
  static async getRecentLocations(): Promise<RecentLocation[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Error retrieving locations:', error);
      return [];
    }
  }

  /**
   * Delete a location from recent locations
   * @param locationId - ID of location to delete
   * @returns Promise<boolean> - true if deleted, false if not found
   */
  static async deleteLocation(locationId: string): Promise<boolean> {
    try {
      const recentLocations = await this.getRecentLocations();
      const initialLength = recentLocations.length;

      const filtered = recentLocations.filter((loc) => loc.id !== locationId);

      if (filtered.length < initialLength) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }

  /**
   * Clear all recent locations from AsyncStorage
   * @returns Promise<void>
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
   * Get location frequency count
   * @param locationId - ID of location
   * @returns Promise<number> - frequency count, or 0 if not found
   */
  static async getLocationFrequency(locationId: string): Promise<number> {
    try {
      const recentLocations = await this.getRecentLocations();
      const location = recentLocations.find((loc) => loc.id === locationId);
      return location ? location.frequency : 0;
    } catch (error) {
      console.error('Error getting location frequency:', error);
      return 0;
    }
  }

  /**
   * Update a location in storage
   * @param location - Location object to update
   * @returns Promise<RecentLocation>
   */
  static async updateLocation(location: Location): Promise<RecentLocation> {
    try {
      const recentLocations = await this.getRecentLocations();
      const index = recentLocations.findIndex((loc) => loc.id === location.id);

      if (index !== -1) {
        const updated = {
          ...recentLocations[index],
          ...location
        };
        recentLocations[index] = updated;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recentLocations));
        return updated;
      }

      throw new Error(`Location with id ${location.id} not found`);
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  /**
   * Set all locations at once (for bulk updates)
   * @param locations - Array of locations to set
   * @returns Promise<void>
   */
  static async setAllLocations(locations: RecentLocation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
    } catch (error) {
      console.error('Error setting all locations:', error);
      throw error;
    }
  }
}

export default LocationStorage;
