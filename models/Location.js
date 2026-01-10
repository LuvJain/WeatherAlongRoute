// @flow

/**
 * Location data structure representing a single location point
 */
export type Location = {
  id: string,
  latitude: number,
  longitude: number,
  address: string,
  city: string,
  country: string,
  postalCode: string,
  validated: boolean,
  timestamp: number
};

/**
 * RecentLocation data structure with frequency tracking
 */
export type RecentLocation = {
  id: string,
  latitude: number,
  longitude: number,
  address: string,
  city: string,
  country: string,
  postalCode: string,
  validated: boolean,
  timestamp: number,
  frequency: number,
  lastUsed: number
};

/**
 * Helper function to create a Location object
 */
export const createLocation = (
  latitude: number,
  longitude: number,
  address: string,
  city: string,
  country: string,
  postalCode: string,
  validated: boolean = false
): Location => {
  return {
    id: generateLocationId(latitude, longitude),
    latitude,
    longitude,
    address,
    city,
    country,
    postalCode,
    validated,
    timestamp: Date.now()
  };
};

/**
 * Helper function to create a RecentLocation object
 */
export const createRecentLocation = (
  location: Location,
  frequency: number = 1,
  lastUsed: number = Date.now()
): RecentLocation => {
  return {
    ...location,
    frequency,
    lastUsed
  };
};

/**
 * Generate a unique ID for a location based on coordinates
 */
export const generateLocationId = (latitude: number, longitude: number): string => {
  return `${latitude.toFixed(6)}_${longitude.toFixed(6)}`;
};
