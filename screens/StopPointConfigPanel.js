// @flow

import React, { Component } from 'react';
import { View, Text, Slider, StyleSheet } from 'react-native';
import type { DetectionConfig } from '../models/GeoTypes';

type Props = {
  config: DetectionConfig,
  onConfigChange: (config: Partial<DetectionConfig>) => void,
};

type State = {
  minDistance: number,
  maxStops: number,
  proximityThreshold: number,
};

/**
 * StopPointConfigPanel allows users to customize stop point detection parameters
 */
export default class StopPointConfigPanel extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      minDistance: props.config.minDistanceInterval,
      maxStops: props.config.maxStopPoints,
      proximityThreshold: props.config.proximityThreshold || 1000,
    };
  }

  /**
   * Update minimum distance interval
   */
  handleMinDistanceChange = (value: number) => {
    this.setState({ minDistance: value }, () => {
      this.props.onConfigChange({
        minDistanceInterval: value,
      });
    });
  };

  /**
   * Update maximum number of stop points
   */
  handleMaxStopsChange = (value: number) => {
    const roundedValue = Math.round(value);
    this.setState({ maxStops: roundedValue }, () => {
      this.props.onConfigChange({
        maxStopPoints: roundedValue,
      });
    });
  };

  /**
   * Update proximity threshold
   */
  handleProximityChange = (value: number) => {
    this.setState({ proximityThreshold: value }, () => {
      this.props.onConfigChange({
        proximityThreshold: value,
      });
    });
  };

  /**
   * Format distance value for display (convert to km)
   */
  formatDistance = (meters: number): string => {
    return (meters / 1000).toFixed(1);
  };

  render() {
    const { minDistance, maxStops, proximityThreshold } = this.state;

    return (
      <View style={styles.container}>
        <Text style={styles.panelTitle}>Detection Settings</Text>

        {/* Minimum Distance Interval */}
        <View style={styles.controlGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Min Distance Between Stops</Text>
            <Text style={styles.value}>{this.formatDistance(minDistance)} km</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={10000}
            maximumValue={200000}
            step={5000}
            value={minDistance}
            onValueChange={this.handleMinDistanceChange}
          />
          <Text style={styles.hint}>
            Minimum distance in kilometers between consecutive stop points
          </Text>
        </View>

        {/* Maximum Stop Points */}
        <View style={styles.controlGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Maximum Stop Points</Text>
            <Text style={styles.value}>{Math.round(maxStops)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={20}
            step={1}
            value={maxStops}
            onValueChange={this.handleMaxStopsChange}
          />
          <Text style={styles.hint}>Maximum number of stop points to detect</Text>
        </View>

        {/* Proximity Threshold */}
        <View style={styles.controlGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Proximity Threshold</Text>
            <Text style={styles.value}>{this.formatDistance(proximityThreshold)} km</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={500}
            maximumValue={10000}
            step={500}
            value={proximityThreshold}
            onValueChange={this.handleProximityChange}
          />
          <Text style={styles.hint}>
            Minimum distance to avoid clustering nearby points
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  controlGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },
  slider: {
    height: 40,
    marginBottom: 8,
  },
  hint: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
});
