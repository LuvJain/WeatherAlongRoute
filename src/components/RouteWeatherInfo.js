/**
 * Route Weather Info Component
 * Displays weather information along a route
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { formatDateTime } from '../utils/timeUtils';

/**
 * Weather icon based on weather condition
 * @param {String} condition - Weather condition
 * @returns {String} - Emoji icon representing the weather
 */
const getWeatherIcon = (condition) => {
  switch (condition.toLowerCase()) {
    case 'clear':
      return '☀️';
    case 'clouds':
      return '☁️';
    case 'rain':
      return '🌧️';
    case 'drizzle':
      return '🌦️';
    case 'thunderstorm':
      return '⛈️';
    case 'snow':
      return '❄️';
    case 'mist':
    case 'fog':
      return '🌫️';
    default:
      return '🌤️';
  }
};

/**
 * Component to display a single weather point
 */
const WeatherPoint = ({ point, index }) => {
  if (!point || !point.weather) {
    return null;
  }

  const weather = point.weather;
  const mainWeather = weather.weather[0];

  return (
    <View style={styles.weatherPointContainer}>
      <Text style={styles.weatherPointTitle}>
        {index === 0 ? 'Start' : index === -1 ? 'End' : `Waypoint ${index}`}
      </Text>
      <Text style={styles.weatherPointTime}>
        {formatDateTime(point.arrivalTimestamp)}
      </Text>
      <View style={styles.weatherRow}>
        <Text style={styles.weatherIcon}>
          {getWeatherIcon(mainWeather.main)}
        </Text>
        <Text style={styles.weatherTemp}>
          {Math.round(weather.main.temp)}°C
        </Text>
      </View>
      <Text style={styles.weatherDesc}>
        {mainWeather.description}
      </Text>
      <Text>
        Wind: {weather.wind.speed} m/s
      </Text>
      <Text>
        Humidity: {weather.main.humidity}%
      </Text>
    </View>
  );
};

/**
 * Component to display weather changes on route
 */
const WeatherChanges = ({ changes }) => {
  if (!changes || changes.length === 0) {
    return (
      <View style={styles.noChangesContainer}>
        <Text style={styles.noChanges}>No significant weather changes on this route</Text>
      </View>
    );
  }

  return (
    <View style={styles.changesContainer}>
      <Text style={styles.changesTitle}>Weather Changes Along Route:</Text>
      {changes.map((change, index) => (
        <View key={index} style={styles.changeItem}>
          <Text style={styles.changeTime}>{formatDateTime(change.arrivalTimestamp)}</Text>
          {change.type === 'condition' ? (
            <Text>
              Weather changes from {change.from} {getWeatherIcon(change.from)} to {change.to} {getWeatherIcon(change.to)}
            </Text>
          ) : (
            <Text>
              Temperature changes from {Math.round(change.from)}°C to {Math.round(change.to)}°C
            </Text>
          )}
          <Text style={styles.changeDistance}>
            {(change.distanceFromStart / 1000).toFixed(1)} km into your journey
          </Text>
        </View>
      ))}
    </View>
  );
};

/**
 * Main Route Weather Info component
 */
const RouteWeatherInfo = ({ routeWeather, loading, error }) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading route weather data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!routeWeather || !routeWeather.waypoints) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Enter your route to see weather information</Text>
      </View>
    );
  }

  const { waypoints, summary } = routeWeather;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Route Weather Summary</Text>
        <Text style={styles.summaryText}>
          Total Distance: {(summary.distance / 1000).toFixed(1)} km
        </Text>
        <Text style={styles.summaryText}>
          Estimated Duration: {Math.floor(summary.duration / 3600)}h {Math.floor((summary.duration % 3600) / 60)}m
        </Text>
      </View>

      <View style={styles.pointsContainer}>
        <Text style={styles.sectionTitle}>Weather at Key Points:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Start point */}
          <WeatherPoint point={waypoints[0]} index={0} />

          {/* Mid points - show a few significant waypoints */}
          {waypoints.length > 2 && (
            <WeatherPoint
              point={waypoints[Math.floor(waypoints.length / 2)]}
              index={Math.floor(waypoints.length / 2)}
            />
          )}

          {/* End point */}
          <WeatherPoint point={waypoints[waypoints.length - 1]} index={-1} />
        </ScrollView>
      </View>

      <WeatherChanges changes={summary.weatherChanges} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    padding: 20,
    backgroundColor: '#ffe6e6',
    borderRadius: 5,
    margin: 10,
  },
  errorText: {
    color: '#cc0000',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 10,
  },
  pointsContainer: {
    marginBottom: 20,
  },
  weatherPointContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    margin: 10,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  weatherPointTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  weatherPointTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  weatherIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weatherDesc: {
    fontSize: 14,
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  changesContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  changesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  changeItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  changeTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  changeDistance: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  noChangesContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  noChanges: {
    color: '#666',
  },
});

export default RouteWeatherInfo;