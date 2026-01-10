// @flow

import { AsyncStorage } from 'react-native';
import type { Location, RecentLocation } from '../models/Location';

const STORAGE_KEY = 'recentLocations';
const MAX_RECENT_ITEMS = 20;

/**
 * LocationStorage Service
 * Manages persistence of locations to AsyncStorage
 * Handles duplicate detection and frequency increment
 */
export class LocationStorageService {
  /**
   * Save a location to recent locations
   * If location already exists, increment frequency instead of creating duplicate
   */
  static async saveLocation(location: Location): Promise<void> {
    try {
      const recentLocations = await this.getRecentLocations();
      const existingIndex = recentLocations.findIndex(
        item => this._isSameLocation(item.location, location)
      );

      if (existingIndex !== -1) {
        // Location already exists, increment frequency
        recentLocations[existingIndex].frequency += 1;
        recentLocations[existingIndex].lastUsed = Date.now();
      } else {
        // New location, add to the beginning
        const newRecentLocation: RecentLocation = {
          location,
          frequency: 1,
          lastUsed: Date.now()
        };
        recentLocations.unshift(newRecentLocation);

        // Keep only the most recent MAX_RECENT_ITEMS
        if (recentLocations.length > MAX_RECENT_ITEMS) {
          recentLocations.pop();
        }
      }

      // Sort by lastUsed in descending order
      recentLocations.sort((a, b) => b.lastUsed - a.lastUsed);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recentLocations));
    } catch (error) {
      console.error('Error saving location to storage:', error);
      throw error;
    }
  }

  /**
   * Retrieve all recent locations from storage
   */
  static async getRecentLocations(): Promise<Array<RecentLocation>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error retrieving recent locations:', error);
      throw error;
    }
  }

  /**
   * Delete a location from recent locations
   */
  static async deleteLocation(locationId: string): Promise<void> {
    try {
      const recentLocations = await this.getRecentLocations();
      const filteredLocations = recentLocations.filter(
        item => item.location.id !== locationId
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLocations));
    } catch (error) {
      console.error('Error deleting location from storage:', error);
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
      console.error('Error clearing locations from storage:', error);
      throw error;
    }
  }

  /**
   * Get location by ID
   */
  static async getLocationById(locationId: string): Promise<?Location> {
    try {
      const recentLocations = await this.getRecentLocations();
      const found = recentLocations.find(item => item.location.id === locationId);
      return found ? found.location : null;
    } catch (error) {
      console.error('Error retrieving location by ID:', error);
      throw error;
    }
  }

  /**
   * Check if two locations are the same (based on coordinates and address)
   */
  static _isSameLocation(location1: Location, location2: Location): boolean {
    return (
      location1.latitude === location2.latitude &&
      location1.longitude === location2.longitude &&
      location1.address === location2.address
    );
  }
}

export default LocationStorageService;
