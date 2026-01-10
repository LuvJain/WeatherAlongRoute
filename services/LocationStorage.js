// @flow

import { AsyncStorage } from 'react-native';
import type { Location, RecentLocation } from '../models/Location';
import { createRecentLocation } from '../models/Location';

const LOCATIONS_STORAGE_KEY = '@WeatherAlongRoute:locations';
const MAX_RECENT_LOCATIONS = 20;

/**
 * LocationStorage service for managing locations in AsyncStorage
 * Handles persistence, deduplication with frequency tracking, and max item limits
 */
class LocationStorage {
  /**
   * Save a location to AsyncStorage
   * If location already exists, increment frequency counter
   * If max items reached, remove oldest least-frequently-used item
   */
  static async saveLocation(location: Location): Promise<RecentLocation[]> {
    try {
      const recentLocations = await this.getRecentLocations();

      // Check if location already exists
      const existingIndex = recentLocations.findIndex(
        (loc: RecentLocation) =>
          loc.location.latitude === location.latitude &&
          loc.location.longitude === location.longitude
      );

      if (existingIndex !== -1) {
        // Increment frequency and update lastUsed
        recentLocations[existingIndex].frequency += 1;
        recentLocations[existingIndex].lastUsed = Date.now();
      } else {
        // Add new location
        const newRecentLocation = createRecentLocation(location);
        recentLocations.unshift(newRecentLocation);

        // Enforce max recent locations limit
        if (recentLocations.length > MAX_RECENT_LOCATIONS) {
          recentLocations.pop();
        }
      }

      // Sort by lastUsed descending to keep recent items first
      recentLocations.sort(
        (a: RecentLocation, b: RecentLocation) => b.lastUsed - a.lastUsed
      );

      await AsyncStorage.setItem(
        LOCATIONS_STORAGE_KEY,
        JSON.stringify(recentLocations)
      );

      return recentLocations;
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  }

  /**
   * Retrieve all recent locations from AsyncStorage
   */
  static async getRecentLocations(): Promise<RecentLocation[]> {
    try {
      const data = await AsyncStorage.getItem(LOCATIONS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error retrieving locations:', error);
      return [];
    }
  }

  /**
   * Delete a location by ID
   */
  static async deleteLocation(locationId: string): Promise<RecentLocation[]> {
    try {
      const recentLocations = await this.getRecentLocations();
      const filtered = recentLocations.filter(
        (loc: RecentLocation) => loc.id !== locationId
      );

      await AsyncStorage.setItem(
        LOCATIONS_STORAGE_KEY,
        JSON.stringify(filtered)
      );

      return filtered;
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }

  /**
   * Clear all locations from storage
   */
  static async clearAllLocations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOCATIONS_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing locations:', error);
      throw error;
    }
  }

  /**
   * Get a specific location by ID
   */
  static async getLocationById(
    locationId: string
  ): Promise<?RecentLocation> {
    try {
      const recentLocations = await this.getRecentLocations();
      return (
        recentLocations.find((loc: RecentLocation) => loc.id === locationId) ||
        null
      );
    } catch (error) {
      console.error('Error getting location by ID:', error);
      return null;
    }
  }
}

export default LocationStorage;
