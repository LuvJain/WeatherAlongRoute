// @flow

import type { StopPoint, Coordinate } from '../models/GeoTypes';
import { haversineDistance } from '../utils/geoUtils';

/**
 * Driver location update
 */
export type DriverLocation = {
  latitude: number,
  longitude: number,
  timestamp?: number,
};

/**
 * Route progress with upcoming stops
 */
export type RouteProgress = {
  driverLocation: DriverLocation,
  distanceTraveled: number,
  remainingStops: Array<StopPoint>,
  completedStops: Array<StopPoint>,
  nextStop: ?StopPoint,
  distanceToNextStop: number,
  eta: ?number, // estimated time in seconds
};

/**
 * Configuration for route progress tracking
 */
export type ProgressConfig = {
  lookaheadDistance: number, // distance in meters for weather refresh (default: 50000m = 50km)
  completionThreshold: number, // distance in meters to mark stop as completed (default: 500m)
  averageSpeed?: number, // average speed in m/s for ETA calculation (default: 15 m/s = 54 km/h)
};

const DEFAULT_CONFIG: ProgressConfig = {
  lookaheadDistance: 50000, // 50 km
  completionThreshold: 500, // 500 meters
  averageSpeed: 15, // ~54 km/h
};

/**
 * RouteProgressTracker manages driver progress along a route and updates stop information dynamically
 */
export class RouteProgressTracker {
  private startPoint: ?Coordinate;
  private allStops: Array<StopPoint>;
  private config: ProgressConfig;

  constructor(config: Partial<ProgressConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.allStops = [];
    this.startPoint = null;
  }

  /**
   * Initialize tracker with route information
   */
  initialize(
    startPoint: Coordinate,
    stopPoints: Array<StopPoint>
  ): void {
    this.startPoint = startPoint;
    this.allStops = [...stopPoints];
  }

  /**
   * Update driver location and calculate progress
   */
  updateProgress(driverLocation: DriverLocation): RouteProgress {
    if (!this.startPoint) {
      throw new Error('RouteProgressTracker not initialized with start point');
    }

    // Calculate cumulative distance traveled from start point
    const distanceTraveled = haversineDistance(this.startPoint, {
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
    });

    // Partition stops into completed and remaining
    const { completedStops, remainingStops } = this.partitionStops(distanceTraveled);

    // Get next stop info
    const nextStop = remainingStops.length > 0 ? remainingStops[0] : null;
    const distanceToNextStop = nextStop
      ? nextStop.distance - distanceTraveled
      : 0;

    // Calculate ETA to next stop based on average speed
    const eta = this.calculateETA(distanceToNextStop);

    return {
      driverLocation,
      distanceTraveled,
      remainingStops,
      completedStops,
      nextStop,
      distanceToNextStop,
      eta,
    };
  }

  /**
   * Get stops within lookahead distance for weather refresh
   */
  getUpcomingStopsForWeather(progress: RouteProgress): Array<StopPoint> {
    const { driverLocation } = progress;
    const driverCoord = {
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
    };

    // Filter stops that are within lookahead distance
    return progress.remainingStops.filter((stop) => {
      const distanceToStop = haversineDistance(driverCoord, stop.coordinate);
      return distanceToStop <= this.config.lookaheadDistance;
    });
  }

  /**
   * Calculate ETA to a destination given distance
   */
  private calculateETA(distanceMeters: number): number {
    const speed = this.config.averageSpeed || 15; // m/s
    return Math.round(distanceMeters / speed);
  }

  /**
   * Partition stops into completed and remaining based on distance traveled
   */
  private partitionStops(
    distanceTraveled: number
  ): {
    completedStops: Array<StopPoint>,
    remainingStops: Array<StopPoint>,
  } {
    const threshold = this.config.completionThreshold;

    const completedStops = this.allStops.filter(
      (stop) => stop.distance - distanceTraveled <= -threshold
    );

    const remainingStops = this.allStops.filter(
      (stop) => stop.distance - distanceTraveled > -threshold
    );

    return { completedStops, remainingStops };
  }

  /**
   * Get configuration
   */
  getConfig(): ProgressConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(newConfig: Partial<ProgressConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.startPoint = null;
    this.allStops = [];
  }
}

// Export singleton instance
export const routeProgressTracker = new RouteProgressTracker();
