// @flow

/**
 * Location data structure representing a geographic location
 * with validation and frequency tracking capabilities.
 */
export type Location = {
  id: string,
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  placeId?: string,
  timestamp: number,
  validated: boolean,
};

/**
 * RecentLocation extends Location with frequency counter
 * to track how many times a location has been selected.
 */
export type RecentLocation = {
  ...Location,
  frequency: number,
};
