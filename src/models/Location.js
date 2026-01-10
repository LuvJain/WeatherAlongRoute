// @flow

/**
 * Location data structure
 */
export type Location = {
  id: string,
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  timestamp: number,
  validated: boolean,
}

/**
 * RecentLocation data structure
 * Extends Location with frequency counter
 */
export type RecentLocation = {
  id: string,
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  timestamp: number,
  validated: boolean,
  frequency: number,
}
