import {
  haversineDistance,
  calculateCumulativeDistance,
  interpolateCoordinate,
  isWithinProximity,
} from '../utils/geoUtils';

describe('geoUtils - Haversine Distance Calculation', () => {
  describe('haversineDistance', () => {
    test('should calculate zero distance for same coordinates', () => {
      const coord = { latitude: 40.7128, longitude: -74.006 };
      const distance = haversineDistance(coord, coord);
      expect(distance).toBeLessThan(0.01); // accounting for floating point
    });

    test('should calculate distance between New York and Los Angeles', () => {
      const ny = { latitude: 40.7128, longitude: -74.006 };
      const la = { latitude: 34.0522, longitude: -118.2437 };
      const distance = haversineDistance(ny, la);
      // Approximate distance is 3944 km = 3,944,000 meters
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(3980000);
    });

    test('should calculate distance between points 1 meter apart', () => {
      const coord1 = { latitude: 40.7128, longitude: -74.006 };
      const coord2 = { latitude: 40.712809, longitude: -74.006 };
      const distance = haversineDistance(coord1, coord2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10);
    });

    test('should handle negative coordinates (southern/western hemispheres)', () => {
      const coord1 = { latitude: -33.8688, longitude: 151.2093 }; // Sydney
      const coord2 = { latitude: -37.8136, longitude: 144.9631 }; // Melbourne
      const distance = haversineDistance(coord1, coord2);
      // Approximate distance is 713 km
      expect(distance).toBeGreaterThan(710000);
      expect(distance).toBeLessThan(720000);
    });

    test('should be symmetric (distance from A to B equals B to A)', () => {
      const coord1 = { latitude: 40.7128, longitude: -74.006 };
      const coord2 = { latitude: 34.0522, longitude: -118.2437 };
      const dist1to2 = haversineDistance(coord1, coord2);
      const dist2to1 = haversineDistance(coord2, coord1);
      expect(Math.abs(dist1to2 - dist2to1)).toBeLessThan(1); // accounting for floating point
    });
  });

  describe('calculateCumulativeDistance', () => {
    test('should return array of same length as input', () => {
      const segments = [
        { coordinate: { latitude: 40.7128, longitude: -74.006 } },
        { coordinate: { latitude: 40.714, longitude: -74.006 } },
        { coordinate: { latitude: 40.716, longitude: -74.006 } },
      ];
      const distances = calculateCumulativeDistance(segments);
      expect(distances.length).toBe(segments.length);
    });

    test('should start with zero distance', () => {
      const segments = [
        { coordinate: { latitude: 40.7128, longitude: -74.006 } },
        { coordinate: { latitude: 40.714, longitude: -74.006 } },
      ];
      const distances = calculateCumulativeDistance(segments);
      expect(distances[0]).toBe(0);
    });

    test('should have monotonically increasing distances', () => {
      const segments = [
        { coordinate: { latitude: 40.7128, longitude: -74.006 } },
        { coordinate: { latitude: 40.715, longitude: -74.006 } },
        { coordinate: { latitude: 40.718, longitude: -74.006 } },
      ];
      const distances = calculateCumulativeDistance(segments);
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
      }
    });
  });

  describe('interpolateCoordinate', () => {
    test('should return start coordinate when ratio is 0', () => {
      const coord1 = { latitude: 40.7128, longitude: -74.006 };
      const coord2 = { latitude: 34.0522, longitude: -118.2437 };
      const result = interpolateCoordinate(coord1, coord2, 0);
      expect(result.latitude).toBeCloseTo(coord1.latitude);
      expect(result.longitude).toBeCloseTo(coord1.longitude);
    });

    test('should return end coordinate when ratio is 1', () => {
      const coord1 = { latitude: 40.7128, longitude: -74.006 };
      const coord2 = { latitude: 34.0522, longitude: -118.2437 };
      const result = interpolateCoordinate(coord1, coord2, 1);
      expect(result.latitude).toBeCloseTo(coord2.latitude);
      expect(result.longitude).toBeCloseTo(coord2.longitude);
    });

    test('should return midpoint when ratio is 0.5', () => {
      const coord1 = { latitude: 40, longitude: -74 };
      const coord2 = { latitude: 42, longitude: -72 };
      const result = interpolateCoordinate(coord1, coord2, 0.5);
      expect(result.latitude).toBeCloseTo(41);
      expect(result.longitude).toBeCloseTo(-73);
    });
  });

  describe('isWithinProximity', () => {
    test('should return true for same coordinates with any threshold', () => {
      const coord = { latitude: 40.7128, longitude: -74.006 };
      expect(isWithinProximity(coord, coord, 0)).toBe(true);
      expect(isWithinProximity(coord, coord, 1000)).toBe(true);
    });

    test('should return false when distance exceeds threshold', () => {
      const coord1 = { latitude: 40.7128, longitude: -74.006 };
      const coord2 = { latitude: 34.0522, longitude: -118.2437 }; // 3944 km away
      expect(isWithinProximity(coord1, coord2, 1000)).toBe(false);
    });

    test('should return true when distance within threshold', () => {
      const coord1 = { latitude: 40.7128, longitude: -74.006 };
      const coord2 = { latitude: 40.714, longitude: -74.006 }; // ~223 meters
      expect(isWithinProximity(coord1, coord2, 1000)).toBe(true);
    });
  });
});
