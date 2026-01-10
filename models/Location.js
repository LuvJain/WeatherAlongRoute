// @flow

/**
 * Location data structure
 * Represents a geographic location with coordinates and details
 */
export type Location = {
  id: string,
  latitude: number,
  longitude: number,
  address: string,
  name?: string,
  placeId?: string,
  validated: boolean,
  timestamp: number
};

/**
 * RecentLocation data structure
 * Represents a recently used location with frequency tracking
 */
export type RecentLocation = {
  location: Location,
  frequency: number,
  lastUsed: number
};
