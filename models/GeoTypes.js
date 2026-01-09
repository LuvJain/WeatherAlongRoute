// @flow

/**
 * Coordinate type representing a geographic point with latitude and longitude
 */
export type Coordinate = {
  latitude: number,
  longitude: number,
};

/**
 * RouteSegment represents a portion of a route between two points
 */
export type RouteSegment = {
  id: string,
  startPoint: Coordinate,
  endPoint: Coordinate,
  distance: number, // distance in meters
  duration: number, // duration in seconds
};

/**
 * StopPoint represents a detected stop along a route
 */
export type StopPoint = {
  id: string,
  coordinate: Coordinate,
  distance: number, // cumulative distance from start in meters
  segmentIndex: number, // which segment this stop is on
  duration?: number, // optional stop duration in seconds
};

/**
 * Detection configuration for stop point detection
 */
export type DetectionConfig = {
  minDistanceInterval: number, // minimum distance between stops in meters (default: 50000)
  maxStopPoints: number, // maximum number of stop points to detect (default: 10)
  proximityThreshold?: number, // distance threshold for clustering nearby points (default: 1000)
};
