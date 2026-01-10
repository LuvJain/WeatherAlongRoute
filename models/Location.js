// @flow

/**
 * Location data structure representing a single location
 */
export type Location = {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  validated: boolean;
  timestamp: number;
};

/**
 * RecentLocation data structure for location history with frequency tracking
 */
export type RecentLocation = {
  id: string;
  location: Location;
  frequency: number;
  lastUsed: number;
};

/**
 * Helper function to create a Location object
 */
export const createLocation = (
  address: string,
  latitude: number,
  longitude: number,
  placeId?: string,
  validated: boolean = false
): Location => {
  return {
    id: `${latitude},${longitude}`,
    address,
    latitude,
    longitude,
    placeId,
    validated,
    timestamp: Date.now(),
  };
};

/**
 * Helper function to create a RecentLocation object
 */
export const createRecentLocation = (location: Location): RecentLocation => {
  return {
    id: location.id,
    location,
    frequency: 1,
    lastUsed: Date.now(),
  };
};
