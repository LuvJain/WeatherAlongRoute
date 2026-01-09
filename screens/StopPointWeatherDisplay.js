// @flow

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { StopPoint } from '../models/GeoTypes';
import type { WeatherData } from '../weatherService';

type Props = {
  stopPoint: StopPoint,
  weather: ?WeatherData,
  isOffline: boolean,
};

/**
 * StopPointWeatherDisplay displays weather information for a single stop point
 * with an offline indicator when weather data is from cache
 */
const StopPointWeatherDisplay = ({ stopPoint, weather, isOffline }: Props) => {
  /**
   * Get weather icon based on condition string
   */
  const getWeatherIcon = (condition: string): string => {
    const lower = condition.toLowerCase();
    if (lower.includes('sunny') || lower.includes('clear')) return '☀️';
    if (lower.includes('cloud')) return '☁️';
    if (lower.includes('rain')) return '🌧️';
    if (lower.includes('snow')) return '❄️';
    if (lower.includes('storm')) return '⛈️';
    if (lower.includes('wind')) return '💨';
    if (lower.includes('fog')) return '🌫️';
    return '🌡️';
  };

  /**
   * Get badge color based on temperature
   */
  const getTempColor = (temp: number): string => {
    if (temp < 0) return '#1976d2'; // Cold - Blue
    if (temp < 15) return '#0288d1'; // Cool - Light Blue
    if (temp < 25) return '#43a047'; // Mild - Green
    if (temp < 35) return '#fb8c00'; // Warm - Orange
    return '#e53935'; // Hot - Red
  };

  const { id, coordinate, distance } = stopPoint;
  const distanceKm = (distance / 1000).toFixed(1);

  return (
    <View style={styles.card}>
      {/* Offline Badge */}
      {isOffline && <View style={styles.offlineBadge} />}

      {/* Stop Point Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.stopId}>{id}</Text>
          <Text style={styles.location}>
            {coordinate.latitude.toFixed(4)}°N, {Math.abs(coordinate.longitude).toFixed(4)}°W
          </Text>
        </View>
        <View style={styles.distance}>
          <Text style={styles.distanceValue}>{distanceKm}</Text>
          <Text style={styles.distanceUnit}>km</Text>
        </View>
      </View>

      {/* Weather Content */}
      {weather ? (
        <View style={styles.weatherContent}>
          <View style={styles.weatherRow}>
            <View style={styles.tempSection}>
              <Text style={[styles.tempValue, { color: getTempColor(weather.temperature) }]}>
                {getWeatherIcon(weather.condition)} {weather.temperature}°F
              </Text>
              <Text style={styles.condition}>{weather.condition}</Text>
            </View>

            <View style={styles.statsSection}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Humidity</Text>
                <Text style={styles.statValue}>{weather.humidity}%</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Wind</Text>
                <Text style={styles.statValue}>{weather.windSpeed} mph</Text>
              </View>
            </View>
          </View>

          {/* Cached Data Indicator */}
          {isOffline && (
            <View style={styles.cachedIndicator}>
              <Text style={styles.cachedText}>📶 Using cached data</Text>
            </View>
          )}

          {/* Timestamp */}
          <Text style={styles.timestamp}>
            Updated: {new Date(weather.fetchTimestamp).toLocaleTimeString()}
          </Text>
        </View>
      ) : (
        <View style={styles.noDataContent}>
          <Text style={styles.noDataText}>Weather data unavailable</Text>
          {isOffline && (
            <Text style={styles.noDataSubtext}>
              No cached weather data available for this stop
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  offlineBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff9800',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stopId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  location: {
    fontSize: 11,
    color: '#999',
  },
  distance: {
    alignItems: 'flex-end',
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  distanceUnit: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  weatherContent: {
    padding: 12,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tempSection: {
    flex: 1,
  },
  tempValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  condition: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  stat: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  cachedIndicator: {
    backgroundColor: '#fff3e0',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  cachedText: {
    fontSize: 11,
    color: '#e65100',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 10,
    color: '#bbb',
    textAlign: 'right',
  },
  noDataContent: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  noDataText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  noDataSubtext: {
    fontSize: 11,
    color: '#bbb',
  },
});

export default StopPointWeatherDisplay;
