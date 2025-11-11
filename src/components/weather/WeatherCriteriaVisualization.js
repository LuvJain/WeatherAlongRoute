/**
 * Weather Criteria Visualization
 * Visual representation of configured weather thresholds
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { AVAILABLE_WEATHER_CONDITIONS } from '../../models/weatherCriteria';

// Helper function to get color based on value
const getColorForValue = (value, min, max) => {
  // Normalize to 0-1 range
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Color ranges from green (0) to yellow (0.5) to red (1)
  if (normalized < 0.5) {
    // Green to yellow
    const r = Math.round(255 * (normalized * 2));
    const g = 255;
    return `rgb(${r}, ${g}, 0)`;
  } else {
    // Yellow to red
    const g = Math.round(255 * (1 - (normalized - 0.5) * 2));
    return `rgb(255, ${g}, 0)`;
  }
};

// Parameter visualization component
const ParameterVisual = ({ title, value, ranges, type = 'range' }) => {
  if (type === 'range') {
    // Get min/max from ranges or use defaults
    const min = ranges?.min?.min || 0;
    const max = ranges?.max?.max || 100;
    const range = max - min;

    // Calculate positions (as percentages)
    const minPos = ((value.min - min) / range) * 100;
    const maxPos = ((value.max - min) / range) * 100;
    const preferredPos = ((value.preferred - min) / range) * 100;

    return (
      <View style={styles.visualContainer}>
        <Text style={styles.visualTitle}>{title}</Text>
        <View style={styles.rangeContainer}>
          <View style={styles.axisLine} />

          {/* Min-max range indicator */}
          <View
            style={[
              styles.rangeIndicator,
              {
                left: `${minPos}%`,
                width: `${maxPos - minPos}%`
              }
            ]}
          />

          {/* Min value marker */}
          <View
            style={[
              styles.valueMarker,
              styles.minMarker,
              { left: `${minPos}%` }
            ]}
          >
            <Text style={styles.markerLabel}>{value.min}</Text>
          </View>

          {/* Max value marker */}
          <View
            style={[
              styles.valueMarker,
              styles.maxMarker,
              { left: `${maxPos}%` }
            ]}
          >
            <Text style={styles.markerLabel}>{value.max}</Text>
          </View>

          {/* Preferred value marker */}
          <View
            style={[
              styles.valueMarker,
              styles.preferredMarker,
              { left: `${preferredPos}%` }
            ]}
          >
            <Text style={styles.preferredLabel}>{value.preferred}</Text>
          </View>

          {/* Scale markers */}
          {[0, 25, 50, 75, 100].map(percent => {
            const scaleValue = min + (range * (percent / 100));
            return (
              <View
                key={percent}
                style={[styles.scaleMarker, { left: `${percent}%` }]}
              >
                <Text style={styles.scaleLabel}>
                  {Math.round(scaleValue * 10) / 10}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  } else if (type === 'threshold') {
    // For simple threshold values (just max or just min)
    const min = ranges?.min || 0;
    const max = ranges?.max || 100;
    const range = max - min;

    // The only value to display (either min or max depending on parameter)
    const thresholdValue = value.max !== undefined ? value.max : value.min;
    const thresholdPos = ((thresholdValue - min) / range) * 100;

    return (
      <View style={styles.visualContainer}>
        <Text style={styles.visualTitle}>{title}</Text>
        <View style={styles.rangeContainer}>
          <View style={styles.axisLine} />

          {/* Threshold marker */}
          <View
            style={[
              styles.valueMarker,
              styles.thresholdMarker,
              { left: `${thresholdPos}%` }
            ]}
          >
            <Text style={styles.markerLabel}>{thresholdValue}</Text>
          </View>

          {/* Scale markers */}
          {[0, 25, 50, 75, 100].map(percent => {
            const scaleValue = min + (range * (percent / 100));
            return (
              <View
                key={percent}
                style={[styles.scaleMarker, { left: `${percent}%` }]}
              >
                <Text style={styles.scaleLabel}>
                  {Math.round(scaleValue * 10) / 10}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  return null;
};

// Boolean parameter visualization
const BooleanVisual = ({ title, value }) => (
  <View style={styles.booleanContainer}>
    <Text style={styles.visualTitle}>{title}</Text>
    <View style={[
      styles.booleanIndicator,
      value ? styles.booleanTrue : styles.booleanFalse
    ]}>
      <Text style={styles.booleanText}>
        {value ? 'Allowed' : 'Not Allowed'}
      </Text>
    </View>
  </View>
);

// Weather conditions visualization
const WeatherConditionsVisual = ({ title, conditions, selected }) => (
  <View style={styles.conditionsContainer}>
    <Text style={styles.visualTitle}>{title}</Text>
    <View style={styles.conditionsGrid}>
      {conditions.map(condition => {
        const isSelected = selected.includes(condition.id);
        return (
          <View
            key={condition.id}
            style={[
              styles.conditionItem,
              isSelected ? styles.conditionSelected : styles.conditionNotSelected
            ]}
          >
            <Text style={[
              styles.conditionText,
              isSelected ? styles.conditionTextSelected : styles.conditionTextNotSelected
            ]}>
              {condition.label}
            </Text>
          </View>
        );
      })}
    </View>
  </View>
);

// Main visualization component
const WeatherCriteriaVisualization = ({ criteria }) => {
  if (!criteria) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerText}>Weather Criteria Visualization</Text>
      <Text style={styles.descriptionText}>
        Visual representation of your configured weather thresholds.
      </Text>

      {/* Temperature visualization */}
      <ParameterVisual
        title="Temperature (°C)"
        value={criteria.temperature}
        ranges={{
          min: { min: -50 },
          max: { max: 50 }
        }}
        type="range"
      />

      {/* Wind speed visualization */}
      <ParameterVisual
        title="Wind Speed (km/h)"
        value={criteria.windSpeed}
        ranges={{
          min: 0,
          max: 120
        }}
        type="threshold"
      />

      {/* Precipitation visualization */}
      <ParameterVisual
        title="Precipitation (mm/h)"
        value={criteria.precipitation}
        ranges={{
          min: 0,
          max: 50
        }}
        type="threshold"
      />

      {/* Visibility visualization */}
      <ParameterVisual
        title="Visibility (km)"
        value={criteria.visibility}
        ranges={{
          min: 0.1,
          max: 20
        }}
        type="range"
      />

      {/* Snow accumulation visualization */}
      <ParameterVisual
        title="Snow Accumulation (cm)"
        value={criteria.snowAccumulation}
        ranges={{
          min: 0,
          max: 30
        }}
        type="threshold"
      />

      {/* Ice conditions */}
      <BooleanVisual
        title="Ice Conditions"
        value={criteria.iceConditions}
      />

      {/* Allowed weather conditions */}
      <WeatherConditionsVisual
        title="Allowed Weather Conditions"
        conditions={AVAILABLE_WEATHER_CONDITIONS}
        selected={criteria.allowedConditions}
      />

      {/* Disallowed weather conditions */}
      <WeatherConditionsVisual
        title="Disallowed Weather Conditions"
        conditions={AVAILABLE_WEATHER_CONDITIONS}
        selected={criteria.disallowedConditions}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 24,
  },
  visualContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  visualTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  rangeContainer: {
    position: 'relative',
    height: 80,
    marginTop: 16,
  },
  axisLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 35,
    height: 2,
    backgroundColor: '#dfe6e9',
  },
  rangeIndicator: {
    position: 'absolute',
    height: 8,
    top: 32,
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  valueMarker: {
    position: 'absolute',
    width: 2,
    height: 16,
    backgroundColor: '#34495e',
    alignItems: 'center',
  },
  minMarker: {
    top: 28,
    backgroundColor: '#e74c3c',
  },
  maxMarker: {
    top: 28,
    backgroundColor: '#e74c3c',
  },
  preferredMarker: {
    top: 16,
    height: 40,
    backgroundColor: '#2ecc71',
    width: 3,
  },
  thresholdMarker: {
    top: 20,
    height: 32,
    backgroundColor: '#e74c3c',
    width: 3,
  },
  markerLabel: {
    position: 'absolute',
    top: 16,
    fontSize: 12,
    color: '#34495e',
    fontWeight: 'bold',
  },
  preferredLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 12,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  scaleMarker: {
    position: 'absolute',
    width: 1,
    height: 6,
    backgroundColor: '#bdc3c7',
    top: 40,
  },
  scaleLabel: {
    position: 'absolute',
    top: 10,
    fontSize: 10,
    color: '#95a5a6',
    textAlign: 'center',
    width: 30,
    marginLeft: -15,
  },
  booleanContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  booleanIndicator: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  booleanTrue: {
    backgroundColor: '#d5f5e3',
  },
  booleanFalse: {
    backgroundColor: '#f8d7da',
  },
  booleanText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  conditionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  conditionItem: {
    borderRadius: 4,
    padding: 8,
    margin: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  conditionSelected: {
    backgroundColor: '#d4efff',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  conditionNotSelected: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  conditionTextSelected: {
    color: '#2980b9',
  },
  conditionTextNotSelected: {
    color: '#95a5a6',
  },
});

export default WeatherCriteriaVisualization;