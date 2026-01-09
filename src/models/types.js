// @flow

/**
 * Location data structure
 * Represents a single location with coordinates and metadata
 */
export type Location = {
  id: string,
  latitude: number,
  longitude: number,
  name: string,
  address: string,
  validated: boolean
};

/**
 * RecentLocation data structure
 * Extends Location with frequency tracking
 */
export type RecentLocation = {
  id: string,
  latitude: number,
  longitude: number,
  name: string,
  address: string,
  validated: boolean,
  frequency: number,
  lastUsed: number // timestamp in milliseconds
};
