// @flow

import type { StopPoint, DetectionConfig, Coordinate, RouteSegment } from '../models/GeoTypes';
import { haversineDistance } from '../utils/geoUtils';

/**
 * Default detection configuration
 */
const DEFAULT_CONFIG: DetectionConfig = {
  minDistanceInterval: 50000, // 50 km
  maxStopPoints: 10,
  proximityThreshold: 1000, // 1 km
};

/**
 * Detect stop points along a route based on distance intervals
 * Takes a route and detection configuration, returns array of StopPoint objects
 */
export function detectStopPoints(
  routeSegments: Array<RouteSegment>,
  config?: Partial<DetectionConfig> = {}
): Array<StopPoint> {
  // Merge provided config with defaults
  const finalConfig: DetectionConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  if (!routeSegments || routeSegments.length === 0) {
    return [];
  }

  if (routeSegments.length === 1) {
    // Single segment route - return start and end as potential stops
    return [];
  }

  const stopPoints: Array<StopPoint> = [];
  let cumulativeDistance = 0;
  let lastStopDistance = 0;
  let stopCounter = 0;
  const { minDistanceInterval, maxStopPoints, proximityThreshold } = finalConfig;

  // Iterate through each segment
  for (let segmentIndex = 0; segmentIndex < routeSegments.length; segmentIndex++) {
    const segment = routeSegments[segmentIndex];

    if (segmentIndex === 0) {
      // Start from the first segment's start point
      lastStopDistance = 0;
      continue;
    }

    // Add segment distance to cumulative
    const prevSegment = routeSegments[segmentIndex - 1];
    const segmentDist = haversineDistance(
      prevSegment.endPoint,
      segment.startPoint
    );
    cumulativeDistance += segmentDist;

    // Check if we should add a stop point at this distance
    if (
      cumulativeDistance - lastStopDistance >= minDistanceInterval &&
      stopCounter < maxStopPoints
    ) {
      // Calculate stop point location (roughly at the segment start)
      const stopPoint: StopPoint = {
        id: `stop_${stopCounter}`,
        coordinate: segment.startPoint,
        distance: Math.round(cumulativeDistance),
        segmentIndex: segmentIndex,
      };

      // Check proximity to previous stops to avoid clustering
      const tooClose = stopPoints.some(
        (existingStop) =>
          haversineDistance(existingStop.coordinate, stopPoint.coordinate) <
          proximityThreshold
      );

      if (!tooClose) {
        stopPoints.push(stopPoint);
        lastStopDistance = cumulativeDistance;
        stopCounter++;
      }
    }
  }

  return stopPoints;
}

/**
 * Validate that stop points respect minimum distance constraints
 */
export function validateStopPoints(
  stopPoints: Array<StopPoint>,
  minDistance: number
): boolean {
  for (let i = 0; i < stopPoints.length - 1; i++) {
    const distance = stopPoints[i + 1].distance - stopPoints[i].distance;
    if (distance < minDistance) {
      return false;
    }
  }
  return true;
}

/**
 * Filter stop points to respect maximum count and constraints
 */
export function filterStopPoints(
  stopPoints: Array<StopPoint>,
  maxCount: number,
  minDistance: number
): Array<StopPoint> {
  if (stopPoints.length <= maxCount) {
    return stopPoints;
  }

  // Sort by distance
  const sorted = [...stopPoints].sort((a, b) => a.distance - b.distance);

  // Greedily select stops while respecting minimum distance
  const filtered: Array<StopPoint> = [];

  for (const stop of sorted) {
    if (filtered.length >= maxCount) {
      break;
    }

    const canAdd =
      filtered.length === 0 ||
      stop.distance - filtered[filtered.length - 1].distance >= minDistance;

    if (canAdd) {
      filtered.push(stop);
    }
  }

  return filtered;
}

/**
 * Get configuration with merged defaults
 */
export function getDefaultConfig(): DetectionConfig {
  return { ...DEFAULT_CONFIG };
}
