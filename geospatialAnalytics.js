// @flow

/**
 * Geospatial Analytics Module
 * Provides stop point detection and route analysis utilities
 */

export type {
  Coordinate,
  RouteSegment,
  StopPoint,
  DetectionConfig,
} from './models/GeoTypes';

export {
  haversineDistance,
  calculateCumulativeDistance,
  interpolateCoordinate,
  isWithinProximity,
} from './utils/geoUtils';

export {
  detectStopPoints,
  validateStopPoints,
  filterStopPoints,
  getDefaultConfig,
} from './services/stopPointDetector';
