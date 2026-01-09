import {
  detectStopPoints,
  validateStopPoints,
  filterStopPoints,
  getDefaultConfig,
} from '../services/stopPointDetector';

describe('stopPointDetector - Stop Point Detection', () => {
  describe('detectStopPoints - Basic Functionality', () => {
    test('should return empty array for empty route', () => {
      const stopPoints = detectStopPoints([]);
      expect(stopPoints).toEqual([]);
    });

    test('should return empty array for single segment route', () => {
      const route = [
        {
          id: 'seg1',
          startPoint: { latitude: 40.7128, longitude: -74.006 },
          endPoint: { latitude: 40.714, longitude: -74.006 },
          distance: 225,
          duration: 30,
        },
      ];
      const stopPoints = detectStopPoints(route);
      expect(stopPoints).toEqual([]);
    });

    test('should detect stop points for multi-segment route', () => {
      // Create a route across US (NY to LA is ~3944 km)
      // We'll use a simplified route with multiple segments
      const route = [];
      let currentLat = 40.7128;
      let currentLon = -74.006;
      const targetLat = 34.0522;
      const targetLon = -118.2437;
      const steps = 10;

      for (let i = 0; i < steps; i++) {
        const nextLat = currentLat + (targetLat - currentLat) / steps;
        const nextLon = currentLon + (targetLon - currentLon) / steps;

        route.push({
          id: `seg${i}`,
          startPoint: { latitude: currentLat, longitude: currentLon },
          endPoint: { latitude: nextLat, longitude: nextLon },
          distance: 50000,
          duration: 1800,
        });

        currentLat = nextLat;
        currentLon = nextLon;
      }

      const stopPoints = detectStopPoints(route);
      expect(stopPoints.length).toBeGreaterThan(0);
      expect(stopPoints.length).toBeLessThanOrEqual(10);
    });
  });

  describe('detectStopPoints - Distance Intervals', () => {
    test('should respect minDistanceInterval config', () => {
      const route = [];
      let currentLat = 40.7128;
      let currentLon = -74.006;
      const steps = 20;
      const targetLat = 34.0522;
      const targetLon = -118.2437;

      for (let i = 0; i < steps; i++) {
        const nextLat = currentLat + (targetLat - currentLat) / steps;
        const nextLon = currentLon + (targetLon - currentLon) / steps;

        route.push({
          id: `seg${i}`,
          startPoint: { latitude: currentLat, longitude: currentLon },
          endPoint: { latitude: nextLat, longitude: nextLon },
          distance: 100000,
          duration: 3600,
        });

        currentLat = nextLat;
        currentLon = nextLon;
      }

      const stopPoints = detectStopPoints(route, {
        minDistanceInterval: 100000, // 100 km between stops
      });

      // Verify each stop is at least minDistanceInterval apart
      for (let i = 0; i < stopPoints.length - 1; i++) {
        const distanceBetweenStops =
          stopPoints[i + 1].distance - stopPoints[i].distance;
        expect(distanceBetweenStops).toBeGreaterThanOrEqual(100000);
      }
    });

    test('should respect maxStopPoints config', () => {
      const route = [];
      let currentLat = 40.7128;
      let currentLon = -74.006;
      const steps = 50;
      const targetLat = 34.0522;
      const targetLon = -118.2437;

      for (let i = 0; i < steps; i++) {
        const nextLat = currentLat + (targetLat - currentLat) / steps;
        const nextLon = currentLon + (targetLon - currentLon) / steps;

        route.push({
          id: `seg${i}`,
          startPoint: { latitude: currentLat, longitude: currentLon },
          endPoint: { latitude: nextLat, longitude: nextLon },
          distance: 50000,
          duration: 1800,
        });

        currentLat = nextLat;
        currentLon = nextLon;
      }

      const maxStops = 5;
      const stopPoints = detectStopPoints(route, {
        minDistanceInterval: 50000,
        maxStopPoints: maxStops,
      });

      expect(stopPoints.length).toBeLessThanOrEqual(maxStops);
    });
  });

  describe('detectStopPoints - Proximity Threshold', () => {
    test('should respect proximityThreshold config', () => {
      // Create a route with close segments
      const route = [
        {
          id: 'seg1',
          startPoint: { latitude: 40.7128, longitude: -74.006 },
          endPoint: { latitude: 40.713, longitude: -74.006 },
          distance: 111,
          duration: 30,
        },
        {
          id: 'seg2',
          startPoint: { latitude: 40.713, longitude: -74.006 },
          endPoint: { latitude: 40.714, longitude: -74.006 },
          distance: 111,
          duration: 30,
        },
        {
          id: 'seg3',
          startPoint: { latitude: 40.714, longitude: -74.006 },
          endPoint: { latitude: 40.800, longitude: -74.006 },
          distance: 9547,
          duration: 600,
        },
        {
          id: 'seg4',
          startPoint: { latitude: 40.800, longitude: -74.006 },
          endPoint: { latitude: 40.890, longitude: -74.006 },
          distance: 9988,
          duration: 600,
        },
      ];

      const stopPoints = detectStopPoints(route, {
        minDistanceInterval: 1000,
        proximityThreshold: 5000, // 5 km threshold
      });

      // Verify no two stops are closer than proximityThreshold
      for (let i = 0; i < stopPoints.length - 1; i++) {
        for (let j = i + 1; j < stopPoints.length; j++) {
          const lat1 = stopPoints[i].coordinate.latitude;
          const lon1 = stopPoints[i].coordinate.longitude;
          const lat2 = stopPoints[j].coordinate.latitude;
          const lon2 = stopPoints[j].coordinate.longitude;

          // Simple distance check (not exact Haversine for test speed)
          const simpleDist = Math.sqrt(
            Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)
          );
          // This is approximate, but should catch major violations
          if (simpleDist > 0) {
            expect(simpleDist).toBeGreaterThan(0.04); // Roughly 5km in degrees
          }
        }
      }
    });
  });

  describe('detectStopPoints - StopPoint Structure', () => {
    test('should return StopPoints with all required fields', () => {
      const route = [];
      let currentLat = 40.7128;
      let currentLon = -74.006;
      const steps = 15;
      const targetLat = 34.0522;
      const targetLon = -118.2437;

      for (let i = 0; i < steps; i++) {
        const nextLat = currentLat + (targetLat - currentLat) / steps;
        const nextLon = currentLon + (targetLon - currentLon) / steps;

        route.push({
          id: `seg${i}`,
          startPoint: { latitude: currentLat, longitude: currentLon },
          endPoint: { latitude: nextLat, longitude: nextLon },
          distance: 50000,
          duration: 1800,
        });

        currentLat = nextLat;
        currentLon = nextLon;
      }

      const stopPoints = detectStopPoints(route);

      stopPoints.forEach((stop) => {
        expect(stop).toHaveProperty('id');
        expect(stop).toHaveProperty('coordinate');
        expect(stop).toHaveProperty('distance');
        expect(stop).toHaveProperty('segmentIndex');

        expect(typeof stop.id).toBe('string');
        expect(typeof stop.coordinate).toBe('object');
        expect(stop.coordinate).toHaveProperty('latitude');
        expect(stop.coordinate).toHaveProperty('longitude');
        expect(typeof stop.distance).toBe('number');
        expect(typeof stop.segmentIndex).toBe('number');
      });
    });
  });

  describe('validateStopPoints', () => {
    test('should validate stops respecting minimum distance', () => {
      const stopPoints = [
        {
          id: 'stop1',
          coordinate: { latitude: 40.7128, longitude: -74.006 },
          distance: 0,
          segmentIndex: 0,
        },
        {
          id: 'stop2',
          coordinate: { latitude: 40.8, longitude: -74.006 },
          distance: 100000,
          segmentIndex: 5,
        },
        {
          id: 'stop3',
          coordinate: { latitude: 40.9, longitude: -74.006 },
          distance: 200000,
          segmentIndex: 10,
        },
      ];

      const isValid = validateStopPoints(stopPoints, 50000);
      expect(isValid).toBe(true);
    });

    test('should invalidate stops violating minimum distance', () => {
      const stopPoints = [
        {
          id: 'stop1',
          coordinate: { latitude: 40.7128, longitude: -74.006 },
          distance: 0,
          segmentIndex: 0,
        },
        {
          id: 'stop2',
          coordinate: { latitude: 40.715, longitude: -74.006 },
          distance: 25000, // Only 25km from previous
          segmentIndex: 2,
        },
        {
          id: 'stop3',
          coordinate: { latitude: 40.9, longitude: -74.006 },
          distance: 200000,
          segmentIndex: 10,
        },
      ];

      const isValid = validateStopPoints(stopPoints, 50000);
      expect(isValid).toBe(false);
    });
  });

  describe('filterStopPoints', () => {
    test('should keep all stops if under max count', () => {
      const stopPoints = [
        {
          id: 'stop1',
          coordinate: { latitude: 40.7128, longitude: -74.006 },
          distance: 0,
          segmentIndex: 0,
        },
        {
          id: 'stop2',
          coordinate: { latitude: 40.8, longitude: -74.006 },
          distance: 100000,
          segmentIndex: 5,
        },
        {
          id: 'stop3',
          coordinate: { latitude: 40.9, longitude: -74.006 },
          distance: 200000,
          segmentIndex: 10,
        },
      ];

      const filtered = filterStopPoints(stopPoints, 5, 50000);
      expect(filtered.length).toBe(3);
    });

    test('should filter stops to respect max count', () => {
      const stopPoints = [
        {
          id: 'stop1',
          coordinate: { latitude: 40.7, longitude: -74.006 },
          distance: 0,
          segmentIndex: 0,
        },
        {
          id: 'stop2',
          coordinate: { latitude: 40.75, longitude: -74.006 },
          distance: 55000,
          segmentIndex: 2,
        },
        {
          id: 'stop3',
          coordinate: { latitude: 40.8, longitude: -74.006 },
          distance: 110000,
          segmentIndex: 5,
        },
        {
          id: 'stop4',
          coordinate: { latitude: 40.85, longitude: -74.006 },
          distance: 165000,
          segmentIndex: 8,
        },
        {
          id: 'stop5',
          coordinate: { latitude: 40.9, longitude: -74.006 },
          distance: 220000,
          segmentIndex: 12,
        },
      ];

      const filtered = filterStopPoints(stopPoints, 3, 50000);
      expect(filtered.length).toBeLessThanOrEqual(3);
    });

    test('should respect minimum distance when filtering', () => {
      const stopPoints = [
        {
          id: 'stop1',
          coordinate: { latitude: 40.7, longitude: -74.006 },
          distance: 0,
          segmentIndex: 0,
        },
        {
          id: 'stop2',
          coordinate: { latitude: 40.75, longitude: -74.006 },
          distance: 55000,
          segmentIndex: 2,
        },
        {
          id: 'stop3',
          coordinate: { latitude: 40.8, longitude: -74.006 },
          distance: 110000,
          segmentIndex: 5,
        },
        {
          id: 'stop4',
          coordinate: { latitude: 40.85, longitude: -74.006 },
          distance: 165000,
          segmentIndex: 8,
        },
      ];

      const filtered = filterStopPoints(stopPoints, 10, 60000);

      // Verify min distance between filtered stops
      for (let i = 0; i < filtered.length - 1; i++) {
        expect(filtered[i + 1].distance - filtered[i].distance).toBeGreaterThanOrEqual(60000);
      }
    });
  });

  describe('getDefaultConfig', () => {
    test('should return default configuration', () => {
      const config = getDefaultConfig();
      expect(config).toHaveProperty('minDistanceInterval');
      expect(config).toHaveProperty('maxStopPoints');
      expect(config).toHaveProperty('proximityThreshold');
      expect(config.minDistanceInterval).toBe(50000);
      expect(config.maxStopPoints).toBe(10);
      expect(config.proximityThreshold).toBe(1000);
    });

    test('should return independent copy of config', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();
      config1.minDistanceInterval = 100000;
      expect(config2.minDistanceInterval).toBe(50000);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle route shorter than minDistanceInterval', () => {
      const route = [
        {
          id: 'seg1',
          startPoint: { latitude: 40.7128, longitude: -74.006 },
          endPoint: { latitude: 40.714, longitude: -74.006 },
          distance: 225,
          duration: 30,
        },
        {
          id: 'seg2',
          startPoint: { latitude: 40.714, longitude: -74.006 },
          endPoint: { latitude: 40.716, longitude: -74.006 },
          distance: 225,
          duration: 30,
        },
        {
          id: 'seg3',
          startPoint: { latitude: 40.716, longitude: -74.006 },
          endPoint: { latitude: 40.718, longitude: -74.006 },
          distance: 225,
          duration: 30,
        },
      ];

      const stopPoints = detectStopPoints(route, {
        minDistanceInterval: 100000, // 100 km
      });

      // Should return empty or minimal stops
      expect(stopPoints.length).toBeLessThanOrEqual(1);
    });

    test('should handle very long routes', () => {
      const route = [];
      let currentLat = 40.7128;
      let currentLon = -74.006;
      const steps = 100;
      const targetLat = -33.8688; // Sydney
      const targetLon = 151.2093;

      for (let i = 0; i < steps; i++) {
        const nextLat = currentLat + (targetLat - currentLat) / steps;
        const nextLon = currentLon + (targetLon - currentLon) / steps;

        route.push({
          id: `seg${i}`,
          startPoint: { latitude: currentLat, longitude: currentLon },
          endPoint: { latitude: nextLat, longitude: nextLon },
          distance: 200000,
          duration: 3600,
        });

        currentLat = nextLat;
        currentLon = nextLon;
      }

      const stopPoints = detectStopPoints(route, {
        minDistanceInterval: 500000,
        maxStopPoints: 10,
      });

      expect(stopPoints.length).toBeLessThanOrEqual(10);
      expect(Array.isArray(stopPoints)).toBe(true);
    });

    test('should handle custom config overrides', () => {
      const route = [];
      let currentLat = 40.7128;
      let currentLon = -74.006;
      const steps = 30;
      const targetLat = 34.0522;
      const targetLon = -118.2437;

      for (let i = 0; i < steps; i++) {
        const nextLat = currentLat + (targetLat - currentLat) / steps;
        const nextLon = currentLon + (targetLon - currentLon) / steps;

        route.push({
          id: `seg${i}`,
          startPoint: { latitude: currentLat, longitude: currentLon },
          endPoint: { latitude: nextLat, longitude: nextLon },
          distance: 50000,
          duration: 1800,
        });

        currentLat = nextLat;
        currentLon = nextLon;
      }

      const stopPoints1 = detectStopPoints(route, { maxStopPoints: 3 });
      const stopPoints2 = detectStopPoints(route, { maxStopPoints: 8 });

      expect(stopPoints1.length).toBeLessThanOrEqual(3);
      expect(stopPoints2.length).toBeLessThanOrEqual(8);
      expect(stopPoints2.length).toBeGreaterThanOrEqual(stopPoints1.length);
    });
  });
});
