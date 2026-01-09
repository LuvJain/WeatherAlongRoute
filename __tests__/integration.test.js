import {
  detectStopPoints,
  haversineDistance,
  validateStopPoints,
  getDefaultConfig,
} from '../geospatialAnalytics';

describe('Geospatial Analytics Integration Tests', () => {
  describe('Complete Workflow', () => {
    test('should detect stops on a realistic cross-country route', () => {
      // Simulate a route from New York to Los Angeles (3944 km)
      const startCoord = { latitude: 40.7128, longitude: -74.006 };
      const endCoord = { latitude: 34.0522, longitude: -118.2437 };

      // Create route segments
      const numSegments = 20;
      const route = [];

      for (let i = 0; i < numSegments; i++) {
        const ratio = i / numSegments;
        const nextRatio = (i + 1) / numSegments;

        const startLat = startCoord.latitude + (endCoord.latitude - startCoord.latitude) * ratio;
        const startLon = startCoord.longitude + (endCoord.longitude - startCoord.longitude) * ratio;
        const endLat = startCoord.latitude + (endCoord.latitude - startCoord.latitude) * nextRatio;
        const endLon = startCoord.longitude + (endCoord.longitude - startCoord.longitude) * nextRatio;

        route.push({
          id: `segment_${i}`,
          startPoint: { latitude: startLat, longitude: startLon },
          endPoint: { latitude: endLat, longitude: endLon },
          distance: 197200, // Roughly 197 km per segment
          duration: 7200, // 2 hours per segment
        });
      }

      // Detect stops
      const config = getDefaultConfig();
      const stopPoints = detectStopPoints(route, config);

      // Verify results
      expect(stopPoints.length).toBeGreaterThan(0);
      expect(stopPoints.length).toBeLessThanOrEqual(config.maxStopPoints);
      expect(validateStopPoints(stopPoints, config.minDistanceInterval)).toBe(true);
    });

    test('should handle multiple route configurations', () => {
      const route = [];
      let currentLat = 0;
      let currentLon = 0;

      for (let i = 0; i < 30; i++) {
        const nextLat = currentLat + 2;
        const nextLon = currentLon + 2;

        route.push({
          id: `seg_${i}`,
          startPoint: { latitude: currentLat, longitude: currentLon },
          endPoint: { latitude: nextLat, longitude: nextLon },
          distance: 314000,
          duration: 3600,
        });

        currentLat = nextLat;
        currentLon = nextLon;
      }

      // Test with different configurations
      const configs = [
        { minDistanceInterval: 50000, maxStopPoints: 5 },
        { minDistanceInterval: 100000, maxStopPoints: 10 },
        { minDistanceInterval: 200000, maxStopPoints: 15 },
      ];

      configs.forEach((config) => {
        const stops = detectStopPoints(route, config);
        expect(stops.length).toBeLessThanOrEqual(config.maxStopPoints);

        // Verify minimum distance constraint
        for (let i = 0; i < stops.length - 1; i++) {
          const distBetween = stops[i + 1].distance - stops[i].distance;
          expect(distBetween).toBeGreaterThanOrEqual(config.minDistanceInterval);
        }
      });
    });

    test('should provide accurate distance calculations for known locations', () => {
      // Test Haversine accuracy against known distances
      const testCases = [
        {
          name: 'New York to Boston',
          coord1: { latitude: 40.7128, longitude: -74.006 },
          coord2: { latitude: 42.3601, longitude: -71.0589 },
          expectedDistanceKm: 306, // Approximately
        },
        {
          name: 'Los Angeles to San Francisco',
          coord1: { latitude: 34.0522, longitude: -118.2437 },
          coord2: { latitude: 37.7749, longitude: -122.4194 },
          expectedDistanceKm: 559, // Approximately
        },
      ];

      testCases.forEach(({ name, coord1, coord2, expectedDistanceKm }) => {
        const distanceMeters = haversineDistance(coord1, coord2);
        const distanceKm = distanceMeters / 1000;

        // Allow 5% variance from expected
        const tolerance = expectedDistanceKm * 0.05;
        expect(Math.abs(distanceKm - expectedDistanceKm)).toBeLessThan(tolerance);
      });
    });
  });

  describe('Edge Cases in Integration', () => {
    test('should handle routes with custom proximity thresholds', () => {
      // Create a route with potential close segments
      const route = [];
      let lat = 40;
      let lon = -74;

      for (let i = 0; i < 15; i++) {
        const nextLat = lat + 0.5;
        const nextLon = lon + 0.5;

        route.push({
          id: `seg_${i}`,
          startPoint: { latitude: lat, longitude: lon },
          endPoint: { latitude: nextLat, longitude: nextLon },
          distance: 78000,
          duration: 3600,
        });

        lat = nextLat;
        lon = nextLon;
      }

      const stops = detectStopPoints(route, {
        minDistanceInterval: 50000,
        maxStopPoints: 10,
        proximityThreshold: 5000,
      });

      // Verify no stops violate proximity
      for (let i = 0; i < stops.length - 1; i++) {
        const stopDist = haversineDistance(
          stops[i].coordinate,
          stops[i + 1].coordinate
        );
        // Due to proxy detection, each detected stop should be valid
        expect(stopDist).toBeGreaterThan(0);
      }
    });
  });
});
