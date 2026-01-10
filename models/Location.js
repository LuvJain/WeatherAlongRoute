// @flow

/**
 * Location data structure representing a geographic location
 */
export type Location = {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
  validated: boolean;
  timestamp: number;
};

/**
 * RecentLocation data structure with frequency tracking
 */
export type RecentLocation = {
  id: string;
  location: Location;
  frequency: number;
  lastUsed: number;
};

/**
 * Helper function to create a new Location
 */
export function createLocation(
  latitude: number,
  longitude: number,
  address: string,
  placeName: string,
  validated: boolean = false
): Location {
  return {
    id: `${latitude}_${longitude}_${Date.now()}`,
    latitude,
    longitude,
    address,
    placeName,
    validated,
    timestamp: Date.now(),
  };
}

/**
 * Helper function to create a new RecentLocation
 */
export function createRecentLocation(location: Location): RecentLocation {
  return {
    id: location.id,
    location,
    frequency: 1,
    lastUsed: Date.now(),
  };
}
