/**
 * @flow
 * Location data structure with TypeScript and Flow type support
 */

// Flow type definition for Location
type Location = {
  id: string,
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  placeId: string,
  validated: boolean,
  timestamp: number,
};

// Flow type definition for RecentLocation
type RecentLocation = {
  id: string,
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  placeId: string,
  lastUsed: number,
};

/**
 * Creates a new Location object
 */
const createLocation = (
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  placeId: string = '',
  validated: boolean = false
): Location => {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name,
    address,
    latitude,
    longitude,
    placeId,
    validated,
    timestamp: Date.now(),
  };
};

/**
 * Converts a Location to a RecentLocation
 */
const toRecentLocation = (location: Location): RecentLocation => {
  return {
    id: location.id,
    name: location.name,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    placeId: location.placeId,
    lastUsed: Date.now(),
  };
};

/**
 * Converts a RecentLocation back to a Location
 */
const toLocation = (recentLocation: RecentLocation, validated: boolean = true): Location => {
  return {
    id: recentLocation.id,
    name: recentLocation.name,
    address: recentLocation.address,
    latitude: recentLocation.latitude,
    longitude: recentLocation.longitude,
    placeId: recentLocation.placeId,
    validated,
    timestamp: Date.now(),
  };
};

module.exports = {
  createLocation,
  toRecentLocation,
  toLocation,
};
