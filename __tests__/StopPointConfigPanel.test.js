import React from 'react';
import renderer from 'react-test-renderer';
import StopPointConfigPanel from '../screens/StopPointConfigPanel';
import { getDefaultConfig } from '../services/stopPointDetector';

describe('StopPointConfigPanel Component Tests', () => {
  let mockOnConfigChange;
  let defaultConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnConfigChange = jest.fn();
    defaultConfig = getDefaultConfig();
  });

  describe('Component Rendering', () => {
    test('should render config panel with title', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).root;

      const titleElements = tree.findAll(
        (node) => node.type === 'Text' && node.props.children === 'Detection Settings'
      );

      expect(titleElements.length).toBeGreaterThan(0);
    });

    test('should render all three control groups', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).root;

      const labels = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const hasMinDistance = labels.some(
        (label) => label.props.children.includes('Min Distance')
      );
      const hasMaxStops = labels.some(
        (label) => label.props.children.includes('Maximum Stop')
      );
      const hasProximity = labels.some(
        (label) => label.props.children.includes('Proximity')
      );

      expect(hasMinDistance).toBe(true);
      expect(hasMaxStops).toBe(true);
      expect(hasProximity).toBe(true);
    });

    test('should render with default config values', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      expect(tree.state.minDistance).toBe(defaultConfig.minDistanceInterval);
      expect(tree.state.maxStops).toBe(defaultConfig.maxStopPoints);
      expect(tree.state.proximityThreshold).toBe(defaultConfig.proximityThreshold);
    });
  });

  describe('Min Distance Interval Control', () => {
    test('should update min distance state on slider change', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleMinDistanceChange(75000);

      expect(tree.state.minDistance).toBe(75000);
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        minDistanceInterval: 75000,
      });
    });

    test('should handle minimum value', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleMinDistanceChange(10000);

      expect(tree.state.minDistance).toBe(10000);
      expect(mockOnConfigChange).toHaveBeenCalled();
    });

    test('should handle maximum value', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleMinDistanceChange(200000);

      expect(tree.state.minDistance).toBe(200000);
      expect(mockOnConfigChange).toHaveBeenCalled();
    });

    test('should format distance in kilometers', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      expect(tree.formatDistance(50000)).toBe('50.0');
      expect(tree.formatDistance(75000)).toBe('75.0');
      expect(tree.formatDistance(100000)).toBe('100.0');
    });
  });

  describe('Maximum Stop Points Control', () => {
    test('should update max stops state on slider change', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleMaxStopsChange(5.7);

      expect(tree.state.maxStops).toBe(6); // Rounded
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        maxStopPoints: 6,
      });
    });

    test('should round max stops to nearest integer', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleMaxStopsChange(7.2);

      expect(tree.state.maxStops).toBe(7);
    });

    test('should handle minimum stop count', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleMaxStopsChange(1);

      expect(tree.state.maxStops).toBe(1);
    });

    test('should handle maximum stop count', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleMaxStopsChange(20);

      expect(tree.state.maxStops).toBe(20);
    });
  });

  describe('Proximity Threshold Control', () => {
    test('should update proximity threshold state on slider change', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleProximityChange(5000);

      expect(tree.state.proximityThreshold).toBe(5000);
      expect(mockOnConfigChange).toHaveBeenCalledWith({
        proximityThreshold: 5000,
      });
    });

    test('should handle minimum threshold value', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleProximityChange(500);

      expect(tree.state.proximityThreshold).toBe(500);
    });

    test('should handle maximum threshold value', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleProximityChange(10000);

      expect(tree.state.proximityThreshold).toBe(10000);
    });
  });

  describe('Config Update Callback', () => {
    test('should call onConfigChange when min distance changes', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleMinDistanceChange(60000);

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        minDistanceInterval: 60000,
      });
    });

    test('should call onConfigChange when max stops changes', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleMaxStopsChange(8);

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        maxStopPoints: 8,
      });
    });

    test('should call onConfigChange when proximity changes', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleProximityChange(3000);

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        proximityThreshold: 3000,
      });
    });
  });

  describe('Custom Config Values', () => {
    test('should render with custom config values', () => {
      const customConfig = {
        minDistanceInterval: 75000,
        maxStopPoints: 7,
        proximityThreshold: 2000,
      };

      const tree = renderer.create(
        <StopPointConfigPanel config={customConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      expect(tree.state.minDistance).toBe(75000);
      expect(tree.state.maxStops).toBe(7);
      expect(tree.state.proximityThreshold).toBe(2000);
    });

    test('should handle missing optional proximityThreshold', () => {
      const configWithoutProximity = {
        minDistanceInterval: 50000,
        maxStopPoints: 10,
      };

      const tree = renderer.create(
        <StopPointConfigPanel config={configWithoutProximity} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      // Should use default or passed value
      expect(tree.state.proximityThreshold).toBeDefined();
    });
  });

  describe('Display Formatting', () => {
    test('should display correct distance units', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).root;

      const labels = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children && typeof node.props.children === 'string'
      );

      const kmLabels = labels.filter(
        (label) => label.props.children && label.props.children.includes('km')
      );

      expect(kmLabels.length).toBeGreaterThan(0);
    });

    test('should display distance values in km', () => {
      const customConfig = {
        minDistanceInterval: 100000,
        maxStopPoints: 10,
        proximityThreshold: 1000,
      };

      const tree = renderer.create(
        <StopPointConfigPanel config={customConfig} onConfigChange={mockOnConfigChange} />
      ).root;

      const valueTexts = tree.findAll(
        (node) => node.type === 'Text'
      ).filter(
        (node) => node.props.children === '100.0' // 100000m formatted
      );

      expect(valueTexts.length).toBeGreaterThan(0);
    });
  });

  describe('State Persistence', () => {
    test('should maintain state across multiple changes', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      ).getInstance();

      tree.handleMinDistanceChange(75000);
      tree.handleMaxStopsChange(5);
      tree.handleProximityChange(2000);

      expect(tree.state.minDistance).toBe(75000);
      expect(tree.state.maxStops).toBe(5);
      expect(tree.state.proximityThreshold).toBe(2000);
    });

    test('should properly reset state with new props', () => {
      const tree = renderer.create(
        <StopPointConfigPanel config={defaultConfig} onConfigChange={mockOnConfigChange} />
      );

      const newConfig = {
        minDistanceInterval: 80000,
        maxStopPoints: 8,
        proximityThreshold: 3000,
      };

      renderer.act(() => {
        tree.update(
          <StopPointConfigPanel config={newConfig} onConfigChange={mockOnConfigChange} />
        );
      });

      const instance = tree.getInstance();
      expect(instance.state.minDistance).toBe(newConfig.minDistanceInterval);
    });
  });
});
