/**
 * Weather Overlay Component
 * Displays weather information overlays on the map
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SEVERITY_LEVELS } from '../../utils/weatherSeverity';

/**
 * Weather Overlay Legend component
 *
 * @param {object} props - Component props
 * @param {boolean} props.visible - Whether the legend is visible
 * @returns {JSX.Element}
 */
export const WeatherLegend = ({ visible = true }) => {
  if (!visible) return null;

  return (
    <View style={styles.legendContainer}>
      <Text style={styles.legendTitle}>Weather Severity</Text>
      <View style={styles.legendItems}>
        {Object.values(SEVERITY_LEVELS).map((level) => {
          // Skip 'none' level in the legend
          if (level === SEVERITY_LEVELS.NONE) return null;

          return (
            <View key={level} style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: getSeverityColor(level) }]}
              />
              <Text style={styles.legendText}>{capitalizeFirstLetter(level)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/**
 * Weather Toggle component to switch overlay display
 *
 * @param {object} props - Component props
 * @param {boolean} props.showWeather - Whether to show weather overlay
 * @param {function} props.onToggle - Toggle callback function
 * @returns {JSX.Element}
 */
export const WeatherToggle = ({ showWeather = true, onToggle }) => {
  return (
    <TouchableOpacity
      style={[
        styles.toggleButton,
        { backgroundColor: showWeather ? '#0066cc' : '#ffffff' }
      ]}
      onPress={onToggle}
    >
      <Text
        style={[
          styles.toggleButtonText,
          { color: showWeather ? '#ffffff' : '#0066cc' }
        ]}
      >
        {showWeather ? 'Hide Weather' : 'Show Weather'}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * Weather Conditions component that displays current weather on the map
 *
 * @param {object} props - Component props
 * @param {object} props.weatherData - Current weather data
 * @param {string} props.units - Units system ('metric' or 'imperial')
 * @returns {JSX.Element}
 */
export const WeatherConditions = ({ weatherData, units = 'metric' }) => {
  if (!weatherData || !weatherData.weather) {
    return null;
  }

  const { weather, measurements } = weatherData;

  return (
    <View style={styles.weatherContainer}>
      <View style={styles.weatherHeader}>
        <Text style={styles.weatherTitle}>{weather.condition}</Text>
        {weather.icon && (
          <Image
            source={{ uri: `http://openweathermap.org/img/w/${weather.icon}.png` }}
            style={styles.weatherIcon}
          />
        )}
      </View>
      <Text style={styles.temperatureText}>
        {measurements.temperature}°{units === 'metric' ? 'C' : 'F'}
      </Text>
      <View style={styles.weatherDetails}>
        <Text style={styles.weatherDetailText}>
          Feels like: {measurements.feelsLike}°{units === 'metric' ? 'C' : 'F'}
        </Text>
        <Text style={styles.weatherDetailText}>
          Wind: {measurements.windSpeed}{units === 'metric' ? ' m/s' : ' mph'}
        </Text>
        <Text style={styles.weatherDetailText}>
          Humidity: {measurements.humidity}%
        </Text>
        {(measurements.rain > 0 || measurements.snow > 0) && (
          <Text style={styles.weatherDetailText}>
            {measurements.rain > 0 ? `Rain: ${measurements.rain} mm/h` : `Snow: ${measurements.snow} mm/h`}
          </Text>
        )}
      </View>
    </View>
  );
};

/**
 * Get severity color
 *
 * @param {string} severity - Severity level
 * @returns {string} - Color hex code
 */
export const getSeverityColor = (severity) => {
  switch (severity) {
    case SEVERITY_LEVELS.EXTREME:
      return '#FF0000'; // Red
    case SEVERITY_LEVELS.HIGH:
      return '#FF6600'; // Orange
    case SEVERITY_LEVELS.MODERATE:
      return '#FFCC00'; // Yellow
    case SEVERITY_LEVELS.LOW:
      return '#33CC33'; // Green
    default:
      return '#3399FF'; // Blue
  }
};

/**
 * Helper function to capitalize first letter
 *
 * @param {string} string - Input string
 * @returns {string} - Capitalized string
 */
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const styles = StyleSheet.create({
  legendContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    maxWidth: 180,
  },
  legendTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  legendItems: {
    flexDirection: 'column',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  legendColor: {
    width: 16,
    height: 6,
    marginRight: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
  },
  toggleButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0066cc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weatherContainer: {
    position: 'absolute',
    top: 70,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    maxWidth: 200,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weatherIcon: {
    width: 40,
    height: 40,
    marginLeft: 10,
  },
  temperatureText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  weatherDetails: {
    marginTop: 5,
  },
  weatherDetailText: {
    fontSize: 12,
    marginBottom: 4,
  },
});