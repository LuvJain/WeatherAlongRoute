# Geospatial Analytics Module

## Overview

The Geospatial Analytics Module provides comprehensive stop point detection and route analysis utilities for the Weather Along Route application. It uses accurate Haversine distance calculations for geographic precision and supports configurable stop detection strategies.

## Architecture

### File Structure

```
├── models/
│   └── GeoTypes.js              # Flow type definitions
├── utils/
│   └── geoUtils.js              # Haversine distance utilities
├── services/
│   └── stopPointDetector.js      # Stop point detection logic
├── __tests__/
│   ├── geoUtils.test.js          # Utility function tests
│   ├── stopPointDetector.test.js  # Detection logic tests
│   └── integration.test.js        # End-to-end integration tests
└── geospatialAnalytics.js         # Main module exports
```

## Type Definitions

### Coordinate
Represents a geographic point with latitude and longitude.
```javascript
type Coordinate = {
  latitude: number,    // -90 to 90
  longitude: number    // -180 to 180
}
```

### RouteSegment
Represents a portion of a route between two points.
```javascript
type RouteSegment = {
  id: string,
  startPoint: Coordinate,
  endPoint: Coordinate,
  distance: number,    // distance in meters
  duration: number     // duration in seconds
}
```

### StopPoint
Represents a detected stop along a route.
```javascript
type StopPoint = {
  id: string,
  coordinate: Coordinate,
  distance: number,         // cumulative distance from start in meters
  segmentIndex: number,     // which segment this stop is on
  duration?: number         // optional stop duration in seconds
}
```

### DetectionConfig
Configuration for stop point detection.
```javascript
type DetectionConfig = {
  minDistanceInterval: number,   // minimum distance between stops in meters (default: 50000)
  maxStopPoints: number,         // maximum number of stop points (default: 10)
  proximityThreshold?: number    // distance threshold for clustering (default: 1000)
}
```

## API Reference

### Distance Utilities

#### `haversineDistance(coord1, coord2): number`
Calculates accurate geographic distance between two coordinates using the Haversine formula.
- **Parameters**: Two Coordinate objects
- **Returns**: Distance in meters
- **Accuracy**: ±0.5% for typical routes

**Example:**
```javascript
const ny = { latitude: 40.7128, longitude: -74.006 };
const la = { latitude: 34.0522, longitude: -118.2437 };
const distance = haversineDistance(ny, la); // ~3,944,000 meters
```

#### `calculateCumulativeDistance(routeSegments, startIndex?): Array<number>`
Calculates cumulative distance along a route from a starting point.
- **Parameters**: Array of route points/segments, optional start index
- **Returns**: Array of cumulative distances in meters

#### `interpolateCoordinate(coord1, coord2, distanceRatio): Coordinate`
Interpolates a coordinate at a specific position between two points.
- **Parameters**: Two coordinates and a ratio (0 to 1)
- **Returns**: Interpolated Coordinate

#### `isWithinProximity(coord1, coord2, thresholdMeters): boolean`
Checks if two coordinates are within a certain distance.
- **Parameters**: Two coordinates and threshold in meters
- **Returns**: Boolean indicating proximity

### Stop Point Detection

#### `detectStopPoints(routeSegments, config?): Array<StopPoint>`
Main function for detecting stop points along a route.
- **Parameters**: Array of RouteSegments and optional DetectionConfig
- **Returns**: Array of detected StopPoint objects
- **Constraints Respected**:
  - Minimum distance between consecutive stops
  - Maximum number of stops
  - Proximity clustering threshold

**Example:**
```javascript
const route = [/* RouteSegment objects */];
const config = {
  minDistanceInterval: 50000,   // 50 km between stops
  maxStopPoints: 10,
  proximityThreshold: 1000      // 1 km clustering
};
const stops = detectStopPoints(route, config);
```

#### `validateStopPoints(stopPoints, minDistance): boolean`
Validates that stop points respect minimum distance constraints.
- **Parameters**: Array of StopPoints and minimum distance in meters
- **Returns**: Boolean indicating validity

#### `filterStopPoints(stopPoints, maxCount, minDistance): Array<StopPoint>`
Filters stop points to respect maximum count and minimum distance constraints.
- **Parameters**: Array of StopPoints, max count, and min distance in meters
- **Returns**: Filtered array of StopPoints

#### `getDefaultConfig(): DetectionConfig`
Returns a fresh copy of the default configuration.
- **Returns**: Default DetectionConfig object

## Key Features

### 1. Accurate Geographic Distance Calculation
Uses the Haversine formula which accounts for Earth's spherical shape:
- Accurate to within ±0.5% for typical route distances
- Works correctly across equators and date lines
- Handles both positive and negative coordinates

### 2. Flexible Stop Detection
- **Distance-based intervals**: Configurable minimum distance between stops
- **Maximum count limiting**: Prevents too many stops on long routes
- **Proximity clustering**: Avoids detecting stops too close together

### 3. Edge Case Handling
- Short routes (shorter than minimum interval)
- Very long routes (global distances)
- Custom configuration overrides
- Boundary condition validation

### 4. Comprehensive Testing
- **Unit tests**: Individual function behavior
- **Integration tests**: Real-world scenarios
- **Edge case tests**: Boundary conditions
- **Coverage**: All acceptance criteria validated

## Usage Examples

### Basic Stop Detection
```javascript
import { detectStopPoints } from './geospatialAnalytics';

// Create a route
const route = [
  {
    id: 'leg1',
    startPoint: { latitude: 40.7128, longitude: -74.006 },
    endPoint: { latitude: 40.8, longitude: -74.006 },
    distance: 8000,
    duration: 600
  },
  // ... more segments
];

// Detect stops with default config
const stops = detectStopPoints(route);

// Stops is an array of StopPoint objects
stops.forEach(stop => {
  console.log(`Stop ${stop.id} at ${stop.coordinate.latitude}, ${stop.coordinate.longitude}`);
  console.log(`Distance from start: ${stop.distance}m`);
});
```

### Custom Configuration
```javascript
import { detectStopPoints } from './geospatialAnalytics';

const customConfig = {
  minDistanceInterval: 100000, // 100 km between stops
  maxStopPoints: 8,
  proximityThreshold: 2000     // 2 km clustering threshold
};

const stops = detectStopPoints(route, customConfig);
```

### Distance Calculation
```javascript
import { haversineDistance } from './geospatialAnalytics';

const startPoint = { latitude: 40.7128, longitude: -74.006 };
const endPoint = { latitude: 34.0522, longitude: -118.2437 };

const distanceMeters = haversineDistance(startPoint, endPoint);
const distanceKm = distanceMeters / 1000;
const distanceMiles = distanceMeters / 1609.34;
```

## Testing

### Running Tests
```bash
npm test
```

### Test Coverage
- **geoUtils.test.js**: 15 test cases covering all distance calculations
- **stopPointDetector.test.js**: 25 test cases covering detection logic
- **integration.test.js**: 5 end-to-end integration tests

### Test Categories
1. **Basic Functionality**: Zero cases, empty inputs, single elements
2. **Configuration**: Distance intervals, max counts, proximity thresholds
3. **Data Structures**: Required fields, proper typing
4. **Constraints**: Minimum distances, maximum counts
5. **Edge Cases**: Short routes, long routes, boundary conditions
6. **Geographic Accuracy**: Known distances between major cities
7. **Integration**: Complete workflows with realistic data

## Performance Characteristics

- **Time Complexity**: O(n) where n is the number of route segments
- **Space Complexity**: O(m) where m is the number of detected stops (≤ maxStopPoints)
- **Distance Calculation**: ~0.5ms per call on modern hardware

## Constants

**EARTH_RADIUS_METERS**: 6,371,000 meters (WGS84 standard)

## Default Configuration Values

```javascript
{
  minDistanceInterval: 50000,    // 50 kilometers
  maxStopPoints: 10,
  proximityThreshold: 1000       // 1 kilometer
}
```

## Integration with React Native

The module is fully compatible with React Native and can be imported directly:
```javascript
import {
  detectStopPoints,
  haversineDistance,
  type StopPoint,
  type Coordinate
} from './geospatialAnalytics';
```

## Error Handling

- Empty or null routes: Returns empty array
- Invalid coordinates: Uses values as-is (caller should validate)
- Missing fields: Type checking at compile time with Flow

## Future Enhancements

- Route optimization for stop placement
- Multi-criteria stop selection (elevation, amenities, etc.)
- Route clustering for alternative paths
- Performance optimization for very large routes (10,000+ segments)
- GeoJSON export functionality

## References

- Haversine Formula: https://en.wikipedia.org/wiki/Haversine_formula
- WGS84 Geodetic System: https://en.wikipedia.org/wiki/World_Geodetic_System
- Flow Type System: https://flow.org/
