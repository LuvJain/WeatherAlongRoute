/**
 * @flow
 * AsyncStorage service for persisting locations
 */

import { AsyncStorage } from 'react-native';
import { toRecentLocation, toLocation } from '../models/Location';

const RECENT_LOCATIONS_KEY = 'recent_locations';
const MAX_RECENT_LOCATIONS = 10;

/**
 * Saves a location to recent locations
 */
const saveRecentLocation = async (location) => {
  try {
    const jsonValue = await AsyncStorage.getItem(RECENT_LOCATIONS_KEY);
    const recentLocations = jsonValue ? JSON.parse(jsonValue) : [];

    // Convert location to recent location
    const recentLocation = toRecentLocation(location);

    // Remove duplicate if exists
    const filtered = recentLocations.filter(loc => loc.placeId !== recentLocation.placeId);

    // Add to front and limit to MAX_RECENT_LOCATIONS
    const updated = [recentLocation, ...filtered].slice(0, MAX_RECENT_LOCATIONS);

    await AsyncStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error saving recent location:', error);
    return [];
  }
};

/**
 * Gets all recent locations
 */
const getRecentLocations = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(RECENT_LOCATIONS_KEY);
    return jsonValue ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error getting recent locations:', error);
    return [];
  }
};

/**
 * Clears all recent locations
 */
const clearRecentLocations = async () => {
  try {
    await AsyncStorage.removeItem(RECENT_LOCATIONS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing recent locations:', error);
    return false;
  }
};

/**
 * Removes a specific location from recent locations
 */
const removeRecentLocation = async (placeId) => {
  try {
    const jsonValue = await AsyncStorage.getItem(RECENT_LOCATIONS_KEY);
    const recentLocations = jsonValue ? JSON.parse(jsonValue) : [];

    const updated = recentLocations.filter(loc => loc.placeId !== placeId);

    if (updated.length === 0) {
      await AsyncStorage.removeItem(RECENT_LOCATIONS_KEY);
    } else {
      await AsyncStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
    }

    return updated;
  } catch (error) {
    console.error('Error removing recent location:', error);
    return [];
  }
};

module.exports = {
  saveRecentLocation,
  getRecentLocations,
  clearRecentLocations,
  removeRecentLocation,
};
