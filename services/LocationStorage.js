// @flow
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Location, RecentLocation } from '../models/Location';
import { generateLocationId, createRecentLocation } from '../models/Location';

const STORAGE_KEY = 'recentLocations';
const MAX_RECENT_LOCATIONS = 20;

/**
 * LocationStorage service for persisting and managing locations
 */
class LocationStorage {
  /**
   * Save a location to recent locations
   * If location already exists, increment frequency counter instead of creating duplicate
   */
  async saveLocation(location: Location): Promise<RecentLocation> {
    try {
      const locations = await this.getRecentLocations();
      const locationId = location.id;

      // Check if location already exists
      const existingIndex = locations.findIndex(loc => loc.id === locationId);

      if (existingIndex !== -1) {
        // Location exists, increment frequency and update lastUsed
        const existing = locations[existingIndex];
        existing.frequency += 1;
        existing.lastUsed = Date.now();

        // Move to front (most recent)
        locations.splice(existingIndex, 1);
        locations.unshift(existing);
      } else {
        // New location
        const recentLocation = createRecentLocation(location, 1, Date.now());

        // Add to front
        locations.unshift(recentLocation);

        // Keep only MAX_RECENT_LOCATIONS
        if (locations.length > MAX_RECENT_LOCATIONS) {
          locations.pop();
        }
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
      return locations[0];
    } catch (error) {
      console.error('Error saving location to storage:', error);
      throw error;
    }
  }

  /**
   * Retrieve all recent locations
   */
  async getRecentLocations(): Promise<RecentLocation[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error retrieving locations from storage:', error);
      throw error;
    }
  }

  /**
   * Retrieve a specific location by ID
   */
  async getLocationById(locationId: string): Promise<?RecentLocation> {
    try {
      const locations = await this.getRecentLocations();
      return locations.find(loc => loc.id === locationId) || null;
    } catch (error) {
      console.error('Error retrieving location by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a location by ID
   */
  async deleteLocation(locationId: string): Promise<void> {
    try {
      const locations = await this.getRecentLocations();
      const filtered = locations.filter(loc => loc.id !== locationId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting location from storage:', error);
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
      console.error('Error clearing locations from storage:', error);
      throw error;
    }
  }

  /**
   * Get locations sorted by frequency (most frequent first)
   */
  async getLocationsByFrequency(): Promise<RecentLocation[]> {
    try {
      const locations = await this.getRecentLocations();
      return locations.sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error('Error getting locations by frequency:', error);
      throw error;
    }
  }

  /**
   * Get locations sorted by last used (most recent first)
   */
  async getLocationsByLastUsed(): Promise<RecentLocation[]> {
    try {
      const locations = await this.getRecentLocations();
      return locations.sort((a, b) => b.lastUsed - a.lastUsed);
    } catch (error) {
      console.error('Error getting locations by last used:', error);
      throw error;
    }
  }

  /**
   * Get count of saved locations
   */
  async getLocationCount(): Promise<number> {
    try {
      const locations = await this.getRecentLocations();
      return locations.length;
    } catch (error) {
      console.error('Error getting location count:', error);
      throw error;
    }
  }
}

export default new LocationStorage();
