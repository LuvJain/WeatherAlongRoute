// @flow

import type { Coordinate } from '../models/GeoTypes';

/**
 * Earth's radius in meters
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate distance between two coordinates using the Haversine formula
 * Returns distance in meters
 */
export function haversineDistance(
  coord1: Coordinate,
  coord2: Coordinate
): number {
  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);
  const deltaLat = toRadians(coord2.latitude - coord1.latitude);
  const deltaLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.asin(Math.sqrt(a));
  const distance = EARTH_RADIUS_METERS * c;

  return distance;
}

/**
 * Calculate cumulative distance along a route from a starting point
 */
export function calculateCumulativeDistance(
  routeSegments: Array<any>, // Array of route points/segments
  startIndex: number = 0
): Array<number> {
  const distances = [0];
  let totalDistance = 0;

  for (let i = startIndex + 1; i < routeSegments.length; i++) {
    const segment = routeSegments[i];
    const prevSegment = routeSegments[i - 1];

    if (
      segment &&
      segment.coordinate &&
      prevSegment &&
      prevSegment.coordinate
    ) {
      const dist = haversineDistance(
        prevSegment.coordinate,
        segment.coordinate
      );
      totalDistance += dist;
      distances.push(totalDistance);
    }
  }

  return distances;
}

/**
 * Interpolate a coordinate at a specific distance along a route
 */
export function interpolateCoordinate(
  coord1: Coordinate,
  coord2: Coordinate,
  distanceRatio: number // 0 to 1, representing position between coord1 and coord2
): Coordinate {
  // Simple linear interpolation for lat/lon
  // For more accuracy over longer distances, use spherical interpolation
  return {
    latitude:
      coord1.latitude + (coord2.latitude - coord1.latitude) * distanceRatio,
    longitude:
      coord1.longitude + (coord2.longitude - coord1.longitude) * distanceRatio,
  };
}

/**
 * Check if two coordinates are within a certain distance (proximity check)
 */
export function isWithinProximity(
  coord1: Coordinate,
  coord2: Coordinate,
  thresholdMeters: number
): boolean {
  return haversineDistance(coord1, coord2) <= thresholdMeters;
}
