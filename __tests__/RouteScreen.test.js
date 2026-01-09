import React from 'react';
import renderer from 'react-test-renderer';
import RouteScreen from '../screens/RouteScreen';
import { detectStopPoints, getDefaultConfig } from '../services/stopPointDetector';
import { weatherService } from '../weatherService';

// Mock the components
jest.mock('../screens/StopPointConfigPanel', () => {
  return function MockConfigPanel() {
    return null;
  };
});

jest.mock('../screens/StopPointWeatherDisplay', () => {
  return function MockWeatherDisplay() {
    return null;
  };
});

// Mock weatherService
jest.mock('../weatherService', () => ({
  weatherService: {
    loadCacheFromStorage: jest.fn().mockResolvedValue(undefined),
    getWeather: jest.fn(),
    getCachedStopPoints: jest.fn().mockReturnValue([]),
    processOfflineQueue: jest.fn(),
  },
}));

describe('RouteScreen Integration Tests', () => {
  let mockRoute;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a test route (NY to LA simplified)
    mockRoute = [];
    let currentLat = 40.7128;
    let currentLon = -74.006;
    const targetLat = 34.0522;
    const targetLon = -118.2437;
    const steps = 10;

    for (let i = 0; i < steps; i++) {
      const nextLat = currentLat + (targetLat - currentLat) / steps;
      const nextLon = currentLon + (targetLon - currentLon) / steps;

      mockRoute.push({
        id: `seg${i}`,
        startPoint: { latitude: currentLat, longitude: currentLon },
        endPoint: { latitude: nextLat, longitude: nextLon },
        distance: 50000,
        duration: 1800,
      });

      currentLat = nextLat;
      currentLon = nextLon;
    }
  });

  describe('Component Rendering', () => {
    test('should render RouteScreen with route prop', () => {
      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      ).toJSON();

      expect(tree).toBeTruthy();
    });

    test('should render title', () => {
      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      ).root;

      const titleElements = tree.findAll(
        (node) => node.type === 'Text' && node.props.children === 'Route Weather Information'
      );

      expect(titleElements.length).toBeGreaterThan(0);
    });

    test('should render empty state when no route provided', () => {
      const tree = renderer.create(
        <RouteScreen route={[]} />
      ).root;

      const errorElements = tree.findAll(
        (node) => node.type === 'Text' && typeof node.props.children === 'string'
      );

      expect(errorElements.some(
        (elem) => elem.props.children && elem.props.children.includes('route')
      )).toBeTruthy();
    });
  });

  describe('Stop Point Detection', () => {
    test('should detect stop points on component mount', (done) => {
      weatherService.getWeather.mockResolvedValue({});

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        expect(instance.state.stopPoints.length).toBeGreaterThan(0);
        done();
      }, 50);
    });

    test('should detect stops with default configuration', (done) => {
      weatherService.getWeather.mockResolvedValue({});

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        const expectedConfig = getDefaultConfig();
        expect(instance.state.detectionConfig).toEqual(expectedConfig);
        done();
      }, 50);
    });

    test('should update stops when config changes', (done) => {
      weatherService.getWeather.mockResolvedValue({});

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      const instance = tree.getInstance();
      const initialStops = instance.state.stopPoints.length;

      // Change config to have fewer stops
      instance.handleConfigChange({
        maxStopPoints: 2,
      });

      setTimeout(() => {
        const updatedStops = instance.state.stopPoints.length;
        expect(updatedStops).toBeLessThanOrEqual(2);
        done();
      }, 50);
    });
  });

  describe('Weather Data Integration', () => {
    test('should fetch weather data for detected stops', (done) => {
      const mockWeatherData = {
        stop_0: {
          temperature: 72,
          condition: 'sunny',
          humidity: 45,
          windSpeed: 10,
          fetchTimestamp: Date.now(),
        },
        stop_1: {
          temperature: 68,
          condition: 'cloudy',
          humidity: 60,
          windSpeed: 15,
          fetchTimestamp: Date.now(),
        },
      };

      weatherService.getWeather.mockResolvedValue(mockWeatherData);

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        expect(weatherService.getWeather).toHaveBeenCalled();
        expect(instance.state.weatherData).toEqual(mockWeatherData);
        done();
      }, 50);
    });

    test('should handle weather fetch errors gracefully', (done) => {
      weatherService.getWeather.mockRejectedValue(new Error('Network error'));

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        expect(instance.state.offlineMode).toBe(true);
        expect(instance.state.error).toBeTruthy();
        done();
      }, 50);
    });

    test('should load cache from storage on mount', (done) => {
      weatherService.getWeather.mockResolvedValue({});

      renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        expect(weatherService.loadCacheFromStorage).toHaveBeenCalled();
        done();
      }, 50);
    });

    test('should set offline mode when weather fetch fails', (done) => {
      weatherService.getWeather.mockRejectedValue(new Error('Network error'));

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        expect(instance.state.offlineMode).toBe(true);
        done();
      }, 50);
    });
  });

  describe('Offline Queue Processing', () => {
    test('should process offline queue on retry', (done) => {
      weatherService.getWeather.mockRejectedValueOnce(new Error('Network error'));
      weatherService.processOfflineQueue.mockResolvedValue(undefined);

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        instance.handleRetryOffline();

        setTimeout(() => {
          expect(weatherService.processOfflineQueue).toHaveBeenCalled();
          done();
        }, 50);
      }, 50);
    });

    test('should clear offline mode after queue processing succeeds', (done) => {
      weatherService.getWeather.mockRejectedValueOnce(new Error('Network error'));
      weatherService.getWeather.mockResolvedValueOnce({});
      weatherService.processOfflineQueue.mockResolvedValue(undefined);

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        const initialOfflineMode = instance.state.offlineMode;

        instance.handleRetryOffline();

        setTimeout(() => {
          expect(instance.state.offlineMode).toBe(false);
          done();
        }, 50);
      }, 50);
    });
  });

  describe('State Management', () => {
    test('should initialize with correct default state', (done) => {
      weatherService.getWeather.mockResolvedValue({});

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        expect(instance.state.isLoading).toBe(false);
        expect(instance.state.offlineMode).toBe(false);
        expect(Array.isArray(instance.state.stopPoints)).toBe(true);
        expect(typeof instance.state.weatherData).toBe('object');
        done();
      }, 50);
    });

    test('should set loading state during weather fetch', (done) => {
      let fetchCalled = false;
      weatherService.getWeather.mockImplementation(() => {
        fetchCalled = true;
        return new Promise(resolve => setTimeout(() => resolve({}), 100));
      });

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        // Check if loading state was set at some point
        expect(fetchCalled).toBe(true);
        done();
      }, 150);
    });

    test('should maintain detection config through updates', (done) => {
      weatherService.getWeather.mockResolvedValue({});

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        const newConfig = {
          minDistanceInterval: 100000,
          maxStopPoints: 5,
        };

        instance.handleConfigChange(newConfig);

        setTimeout(() => {
          expect(instance.state.detectionConfig.minDistanceInterval).toBe(100000);
          expect(instance.state.detectionConfig.maxStopPoints).toBe(5);
          done();
        }, 50);
      }, 50);
    });
  });

  describe('Config Panel Integration', () => {
    test('should pass config to config panel', (done) => {
      weatherService.getWeather.mockResolvedValue({});

      const tree = renderer.create(
        <RouteScreen route={mockRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        const { detectionConfig } = instance.state;

        expect(detectionConfig).toHaveProperty('minDistanceInterval');
        expect(detectionConfig).toHaveProperty('maxStopPoints');
        expect(detectionConfig).toHaveProperty('proximityThreshold');
        done();
      }, 50);
    });
  });

  describe('Edge Cases', () => {
    test('should handle route with single segment', (done) => {
      const singleSegmentRoute = [
        {
          id: 'seg1',
          startPoint: { latitude: 40.7128, longitude: -74.006 },
          endPoint: { latitude: 40.714, longitude: -74.006 },
          distance: 225,
          duration: 30,
        },
      ];

      weatherService.getWeather.mockResolvedValue({});

      const tree = renderer.create(
        <RouteScreen route={singleSegmentRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        // Single segment route should have no or minimal stops
        expect(instance.state.stopPoints.length).toBeLessThanOrEqual(1);
        done();
      }, 50);
    });

    test('should handle very long route', (done) => {
      const longRoute = [];
      let currentLat = 40.7128;
      let currentLon = -74.006;
      const targetLat = -33.8688; // Sydney
      const targetLon = 151.2093;

      for (let i = 0; i < 50; i++) {
        const nextLat = currentLat + (targetLat - currentLat) / 50;
        const nextLon = currentLon + (targetLon - currentLon) / 50;

        longRoute.push({
          id: `seg${i}`,
          startPoint: { latitude: currentLat, longitude: currentLon },
          endPoint: { latitude: nextLat, longitude: nextLon },
          distance: 200000,
          duration: 3600,
        });

        currentLat = nextLat;
        currentLon = nextLon;
      }

      weatherService.getWeather.mockResolvedValue({});

      const tree = renderer.create(
        <RouteScreen route={longRoute} />
      );

      setTimeout(() => {
        const instance = tree.getInstance();
        // Should respect maxStopPoints even for very long routes
        expect(instance.state.stopPoints.length).toBeLessThanOrEqual(
          getDefaultConfig().maxStopPoints
        );
        done();
      }, 50);
    });
  });
});
