/**
 * @flow
 * Location storage service using AsyncStorage
 */

import { AsyncStorage } from 'react-native';
import type { RecentLocation } from '../models/Location';

const RECENT_LOCATIONS_KEY = 'recent_locations';
const MAX_RECENT_LOCATIONS = 10;

/**
 * Gets recent locations from AsyncStorage
 * @returns {Promise<Array<RecentLocation>>} - Array of recent locations
 */
export const getRecentLocations = async (): Promise<Array<RecentLocation>> => {
  try {
    const data = await AsyncStorage.getItem(RECENT_LOCATIONS_KEY);
    if (!data) return [];
    const locations = JSON.parse(data);
    return Array.isArray(locations) ? locations : [];
  } catch (error) {
    console.warn('Failed to get recent locations:', error);
    return [];
  }
};

/**
 * Saves recent locations to AsyncStorage
 * @param {Array<RecentLocation>} locations - Array of recent locations
 * @returns {Promise<void>}
 */
export const saveRecentLocations = async (
  locations: Array<RecentLocation>
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      RECENT_LOCATIONS_KEY,
      JSON.stringify(locations)
    );
  } catch (error) {
    console.warn('Failed to save recent locations:', error);
  }
};

/**
 * Adds or updates a location in recent locations
 * @param {RecentLocation} location - Location to add/update
 * @returns {Promise<void>}
 */
export const addRecentLocation = async (
  location: RecentLocation
): Promise<void> => {
  try {
    const locations = await getRecentLocations();

    // Check if location already exists
    const existingIndex = locations.findIndex(
      (loc) => loc.placeId === location.placeId
    );

    if (existingIndex >= 0) {
      // Update existing location
      locations[existingIndex].lastUsed = Date.now();
      locations[existingIndex].useCount += 1;
    } else {
      // Add new location
      locations.unshift(location);
    }

    // Keep only the most recent locations
    const trimmed = locations.slice(0, MAX_RECENT_LOCATIONS);

    await saveRecentLocations(trimmed);
  } catch (error) {
    console.warn('Failed to add recent location:', error);
  }
};

/**
 * Clears all recent locations
 * @returns {Promise<void>}
 */
export const clearRecentLocations = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENT_LOCATIONS_KEY);
  } catch (error) {
    console.warn('Failed to clear recent locations:', error);
  }
};

/**
 * Removes a specific location from recent locations
 * @param {string} placeId - Place ID of location to remove
 * @returns {Promise<void>}
 */
export const removeRecentLocation = async (placeId: string): Promise<void> => {
  try {
    const locations = await getRecentLocations();
    const filtered = locations.filter((loc) => loc.placeId !== placeId);
    await saveRecentLocations(filtered);
  } catch (error) {
    console.warn('Failed to remove recent location:', error);
  }
};
