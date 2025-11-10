/**
 * Route Weather Component
 * Displays weather information for a route with warnings
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import WeatherWarning from './WeatherWarning';
import { SEVERITY_LEVELS } from '../../utils/weatherSeverity';

/**
 * Route Weather component
 *
 * @param {object} props - Component props
 * @param {object} props.routeWeather - Route weather forecast data
 * @param {object} props.routeWeather.routeOverview - Overview of the route
 * @param {Array} props.routeWeather.segments - Route segments with weather data
 * @param {Array} props.routeWeather.warnings - Weather warnings for the route
 * @returns {JSX.Element}
 */
const RouteWeather = ({ routeWeather }) => {
  const [expandedWarningIndex, setExpandedWarningIndex] = useState(null);
  const [showSegmentDetails, setShowSegmentDetails] = useState(false);

  if (!routeWeather) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading route weather...</Text>
      </View>
    );
  }

  const { routeOverview, segments, warnings } = routeWeather;

  // Function to toggle warning expansion
  const toggleWarningExpansion = (index) => {
    if (expandedWarningIndex === index) {
      setExpandedWarningIndex(null);
    } else {
      setExpandedWarningIndex(index);
    }
  };

  // Get background color based on highest severity
  const getOverviewBackgroundColor = (severity) => {
    switch (severity) {
      case SEVERITY_LEVELS.EXTREME:
        return '#FFF0F0'; // Light red
      case SEVERITY_LEVELS.HIGH:
        return '#FFF7F0'; // Light orange
      case SEVERITY_LEVELS.MODERATE:
        return '#FFFDF0'; // Light yellow
      case SEVERITY_LEVELS.LOW:
        return '#F0FFF0'; // Light green
      default:
        return '#F0F8FF'; // Light blue
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Route Overview */}
      <View style={[
        styles.overviewContainer,
        { backgroundColor: getOverviewBackgroundColor(routeOverview.highestSeverity) }
      ]}>
        <Text style={styles.overviewTitle}>Route Weather Overview</Text>

        {routeOverview.highestSeverity !== SEVERITY_LEVELS.NONE && (
          <Text style={styles.highestSeverity}>
            Highest Severity: {routeOverview.highestSeverity.toUpperCase()}
          </Text>
        )}

        <Text style={styles.overviewDetails}>
          {segments.length} segments • {routeOverview.waypoints} waypoints
        </Text>
      </View>

      {/* Weather Warnings */}
      <View style={styles.warningsContainer}>
        <Text style={styles.sectionTitle}>Weather Warnings</Text>

        {warnings.map((warning, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => toggleWarningExpansion(index)}
            activeOpacity={0.8}
          >
            <WeatherWarning
              warning={warning}
              expanded={expandedWarningIndex === index}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Route Segments Weather */}
      <View style={styles.segmentsContainer}>
        <View style={styles.segmentHeaderRow}>
          <Text style={styles.sectionTitle}>Route Segment Weather</Text>
          <TouchableOpacity onPress={() => setShowSegmentDetails(!showSegmentDetails)}>
            <Text style={styles.toggleText}>
              {showSegmentDetails ? 'Hide Details' : 'Show Details'}
            </Text>
          </TouchableOpacity>
        </View>

        {segments.map((segment, index) => (
          <View
            key={index}
            style={[
              styles.segmentItem,
              { borderLeftColor: segment.weatherAvailable ? segment.weather ?
                weatherSeverityColorOpacity(segment.severity) : '#CCCCCC' : '#CCCCCC' }
            ]}
          >
            <Text style={styles.segmentTitle}>
              Segment {index + 1}
              {segment.weatherAvailable ? '' : ' (No Weather Data)'}
            </Text>

            {segment.weatherAvailable && segment.weather && (
              <View>
                <Text style={styles.segmentWeather}>
                  {segment.weather.weather.condition}, {segment.weather.measurements.temperature}°
                  {routeOverview.units === 'metric' ? 'C' : 'F'}
                </Text>

                {showSegmentDetails && (
                  <View style={styles.segmentDetails}>
                    <Text style={styles.segmentDetailText}>
                      {segment.weather.weather.description}
                    </Text>
                    <Text style={styles.segmentDetailText}>
                      Wind: {segment.weather.measurements.windSpeed}
                      {routeOverview.units === 'metric' ? ' m/s' : ' mph'}
                    </Text>
                    <Text style={styles.segmentDetailText}>
                      Humidity: {segment.weather.measurements.humidity}%
                    </Text>
                    {(segment.weather.measurements.rain > 0 || segment.weather.measurements.snow > 0) && (
                      <Text style={styles.segmentDetailText}>
                        {segment.weather.measurements.rain > 0 ?
                          `Rain: ${segment.weather.measurements.rain} mm/h` :
                          `Snow: ${segment.weather.measurements.snow} mm/h`}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

/**
 * Helper to get semi-transparent color for severity level
 *
 * @param {string} severity - Severity level
 * @returns {string} - Color with opacity
 */
const weatherSeverityColorOpacity = (severity) => {
  switch (severity) {
    case SEVERITY_LEVELS.EXTREME:
      return '#FF0000';
    case SEVERITY_LEVELS.HIGH:
      return '#FF6600';
    case SEVERITY_LEVELS.MODERATE:
      return '#FFCC00';
    case SEVERITY_LEVELS.LOW:
      return '#33CC33';
    default:
      return '#3399FF';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    padding: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  overviewContainer: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  highestSeverity: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  overviewDetails: {
    fontSize: 14,
  },
  warningsContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  segmentsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  segmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#0066CC',
  },
  segmentItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderLeftWidth: 4,
  },
  segmentTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  segmentWeather: {
    fontSize: 14,
  },
  segmentDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  segmentDetailText: {
    fontSize: 14,
    marginBottom: 4,
  },
});

export default RouteWeather;