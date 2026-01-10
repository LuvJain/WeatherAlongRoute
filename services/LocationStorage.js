// @flow

import AsyncStorage from '@react-native-community/async-storage';
import type { Location, RecentLocation } from '../models/Location';
import { createRecentLocation } from '../models/Location';

const STORAGE_KEY = 'RECENT_LOCATIONS';
const MAX_RECENT_ITEMS = 20;

/**
 * LocationStorage service for persisting locations to AsyncStorage
 * Handles saving, retrieving, deleting locations with duplicate detection
 */
export class LocationStorage {
  /**
   * Save a location to recent locations
   * If location already exists, increment frequency counter
   * Keep only the most recent 20 locations
   */
  static async saveLocation(location: Location): Promise<void> {
    try {
      const recentLocations = await this.getRecentLocations();

      // Check if location already exists
      const existingIndex = recentLocations.findIndex(
        (item) => item.id === location.id
      );

      if (existingIndex !== -1) {
        // Increment frequency and update lastUsed
        recentLocations[existingIndex].frequency += 1;
        recentLocations[existingIndex].lastUsed = Date.now();
        // Move to front (most recently used)
        const item = recentLocations.splice(existingIndex, 1)[0];
        recentLocations.unshift(item);
      } else {
        // Create new recent location
        const recentLocation = createRecentLocation(location);
        recentLocations.unshift(recentLocation);
      }

      // Keep only the most recent MAX_RECENT_ITEMS
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
  static async getRecentLocations(): Promise<Array<RecentLocation>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
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
   * Get a specific recent location by ID
   */
  static async getRecentLocationById(id: string): Promise<?RecentLocation> {
    try {
      const recentLocations = await this.getRecentLocations();
      return recentLocations.find((item) => item.id === id) || null;
    } catch (error) {
      console.error('Error retrieving location by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a location from recent locations
   */
  static async deleteLocation(id: string): Promise<void> {
    try {
      const recentLocations = await this.getRecentLocations();
      const filteredLocations = recentLocations.filter(
        (item) => item.id !== id
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
  static async clearAllLocations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing locations:', error);
      throw error;
    }
  }

  /**
   * Get locations sorted by frequency (most used first)
   */
  static async getLocationsByFrequency(): Promise<Array<RecentLocation>> {
    try {
      const recentLocations = await this.getRecentLocations();
      return [...recentLocations].sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error('Error retrieving locations by frequency:', error);
      throw error;
    }
  }

  /**
   * Get the count of stored recent locations
   */
  static async getLocationCount(): Promise<number> {
    try {
      const recentLocations = await this.getRecentLocations();
      return recentLocations.length;
    } catch (error) {
      console.error('Error getting location count:', error);
      throw error;
    }
  }
}

export default LocationStorage;
