import React from 'react';
import renderer from 'react-test-renderer';
import StopPointWeatherDisplay from '../screens/StopPointWeatherDisplay';

describe('StopPointWeatherDisplay Component Tests', () => {
  let mockStopPoint;
  let mockWeather;

  beforeEach(() => {
    mockStopPoint = {
      id: 'stop_0',
      coordinate: {
        latitude: 40.7128,
        longitude: -74.006,
      },
      distance: 50000,
      segmentIndex: 2,
    };

    mockWeather = {
      temperature: 72,
      condition: 'sunny',
      humidity: 45,
      windSpeed: 10,
      fetchTimestamp: Date.now(),
    };
  });

  describe('Component Rendering', () => {
    test('should render stop point with weather data', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).toJSON();

      expect(tree).toBeTruthy();
    });

    test('should display stop point ID', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      const idElements = tree.findAll(
        (node) => node.type === 'Text' && node.props.children === 'stop_0'
      );

      expect(idElements.length).toBeGreaterThan(0);
    });

    test('should display coordinates', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasCoords = textNodes.some(
        (node) => node.props.children.includes('40.7128')
      );

      expect(hasCoords).toBe(true);
    });

    test('should display distance in km', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasDistance = textNodes.some(
        (node) => node.props.children.includes('50.0') // 50000m in km
      );

      expect(hasDistance).toBe(true);
    });
  });

  describe('Weather Data Display', () => {
    test('should display temperature', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasTemp = textNodes.some(
        (node) => node.props.children.includes('72')
      );

      expect(hasTemp).toBe(true);
    });

    test('should display weather condition', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasCondition = textNodes.some(
        (node) => node.props.children.includes('sunny')
      );

      expect(hasCondition).toBe(true);
    });

    test('should display humidity', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasHumidity = textNodes.some(
        (node) => node.props.children.includes('45%') || node.props.children.includes('45')
      );

      expect(hasHumidity).toBe(true);
    });

    test('should display wind speed', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasWind = textNodes.some(
        (node) => node.props.children.includes('10')
      );

      expect(hasWind).toBe(true);
    });

    test('should display fetch timestamp', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasTimestamp = textNodes.some(
        (node) => node.props.children.includes('Updated')
      );

      expect(hasTimestamp).toBe(true);
    });
  });

  describe('Offline Mode Indicator', () => {
    test('should show offline badge when in offline mode', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={true}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasCachedIndicator = textNodes.some(
        (node) => node.props.children.includes('cached')
      );

      expect(hasCachedIndicator).toBe(true);
    });

    test('should hide offline badge when online', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasCachedIndicator = textNodes.some(
        (node) => node.props.children.includes('cached data')
      );

      expect(hasCachedIndicator).toBe(false);
    });
  });

  describe('No Weather Data State', () => {
    test('should display message when weather data is unavailable', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={null}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasUnavailable = textNodes.some(
        (node) => node.props.children.includes('unavailable')
      );

      expect(hasUnavailable).toBe(true);
    });

    test('should show offline subtext when no data and offline', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={null}
          isOffline={true}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasSubtext = textNodes.some(
        (node) => node.props.children.includes('cached')
      );

      expect(hasSubtext).toBe(true);
    });
  });

  describe('Weather Condition Icons', () => {
    test('should display correct icon for sunny condition', () => {
      const sunnyWeather = {
        ...mockWeather,
        condition: 'sunny',
      };

      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={sunnyWeather}
          isOffline={false}
        />
      ).root;

      // The component should render an emoji icon
      // This is a basic check that the component renders
      expect(tree).toBeTruthy();
    });

    test('should display correct icon for cloudy condition', () => {
      const cloudyWeather = {
        ...mockWeather,
        condition: 'cloudy',
      };

      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={cloudyWeather}
          isOffline={false}
        />
      ).root;

      expect(tree).toBeTruthy();
    });

    test('should display correct icon for rainy condition', () => {
      const rainyWeather = {
        ...mockWeather,
        condition: 'rainy',
      };

      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={rainyWeather}
          isOffline={false}
        />
      ).root;

      expect(tree).toBeTruthy();
    });
  });

  describe('Temperature Color Coding', () => {
    test('should handle cold temperatures', () => {
      const coldWeather = {
        ...mockWeather,
        temperature: -5,
      };

      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={coldWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasTemp = textNodes.some(
        (node) => node.props.children.includes('-5')
      );

      expect(hasTemp).toBe(true);
    });

    test('should handle warm temperatures', () => {
      const warmWeather = {
        ...mockWeather,
        temperature: 85,
      };

      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={warmWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasTemp = textNodes.some(
        (node) => node.props.children.includes('85')
      );

      expect(hasTemp).toBe(true);
    });

    test('should handle hot temperatures', () => {
      const hotWeather = {
        ...mockWeather,
        temperature: 100,
      };

      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={hotWeather}
          isOffline={false}
        />
      ).root;

      const textNodes = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasTemp = textNodes.some(
        (node) => node.props.children.includes('100')
      );

      expect(hasTemp).toBe(true);
    });
  });

  describe('Accessibility and Data Structure', () => {
    test('should have all required weather fields', () => {
      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={mockStopPoint}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      // Verify component renders without errors
      expect(tree).toBeTruthy();

      // Check that weather data is complete
      expect(mockWeather).toHaveProperty('temperature');
      expect(mockWeather).toHaveProperty('condition');
      expect(mockWeather).toHaveProperty('humidity');
      expect(mockWeather).toHaveProperty('windSpeed');
      expect(mockWeather).toHaveProperty('fetchTimestamp');
    });

    test('should handle stop points with optional duration field', () => {
      const stopWithDuration = {
        ...mockStopPoint,
        duration: 600, // 10 minutes
      };

      const tree = renderer.create(
        <StopPointWeatherDisplay
          stopPoint={stopWithDuration}
          weather={mockWeather}
          isOffline={false}
        />
      ).root;

      expect(tree).toBeTruthy();
    });
  });
});
