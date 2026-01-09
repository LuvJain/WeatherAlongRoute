/**
 * @flow
 * Location data model with Flow types
 */

export type Location = {
  id: string,
  place: string,
  placeId: string,
  latitude: number,
  longitude: number,
  validated: boolean,
  description?: string,
  createdAt?: number,
};

export type RecentLocation = {
  id: string,
  place: string,
  placeId: string,
  latitude: number,
  longitude: number,
  lastUsed: number,
  useCount: number,
};

/**
 * Validates location object has required fields
 * @param {Location} location - Location object to validate
 * @returns {boolean} - True if location has required fields
 */
export const isValidLocation = (location: ?Location): boolean => {
  if (!location) return false;
  return !!(location.place && location.latitude && location.longitude);
};

/**
 * Creates location object from place data
 * @param {string} place - Place name
 * @param {string} placeId - Place ID from Google Places
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {boolean} validated - Whether location is validated
 * @returns {Location} - Location object
 */
export const createLocation = (
  place: string,
  placeId: string,
  latitude: number,
  longitude: number,
  validated: boolean = false,
  description?: string
): Location => {
  return {
    id: `${placeId}_${Date.now()}`,
    place,
    placeId,
    latitude,
    longitude,
    validated,
    description,
    createdAt: Date.now(),
  };
};

/**
 * Creates recent location object
 * @param {string} place - Place name
 * @param {string} placeId - Place ID from Google Places
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {RecentLocation} - Recent location object
 */
export const createRecentLocation = (
  place: string,
  placeId: string,
  latitude: number,
  longitude: number
): RecentLocation => {
  return {
    id: `${placeId}_recent`,
    place,
    placeId,
    latitude,
    longitude,
    lastUsed: Date.now(),
    useCount: 1,
  };
};
