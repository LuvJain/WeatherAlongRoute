// @flow

export type Location = {
  id: string,
  latitude: number,
  longitude: number,
  address: string,
  name?: string,
  validated: boolean,
  placeId?: string,
  timestamp: number,
};

export type RecentLocation = {
  ...Location,
  frequency: number,
};
