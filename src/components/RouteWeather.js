/**
 * RouteWeather - Component for displaying weather data along a route
 */
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import WeatherItem from './WeatherItem';
import { fetchWeatherForRoute } from '../services/weatherService';
import { getRouteData } from '../services/routeService';

const RouteWeather = ({ origin, destination, onError }) => {
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(null);
  const [weatherData, setWeatherData] = useState([]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch route and weather data
  const fetchRouteWeather = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Validate input
      if (!origin || !origin.lat || !origin.lng || !destination || !destination.lat || !destination.lng) {
        setError('Invalid origin or destination');
        setLoading(false);
        if (onError) onError('Invalid origin or destination');
        return;
      }

      // Get route data (including waypoints)
      const routeData = await getRouteData(origin, destination, forceRefresh);
      setRoute(routeData);

      // Prepare waypoints for weather API
      const waypoints = routeData.waypoints.map(wp => ({
        lat: wp.lat,
        lon: wp.lng, // Convert lng to lon for OpenWeatherMap API
      }));

      // Fetch weather for all waypoints
      const weatherResults = await fetchWeatherForRoute(waypoints, forceRefresh);

      // Combine waypoint info with weather data
      const combinedData = routeData.waypoints.map((waypoint, index) => ({
        id: `wp_${index}`,
        location: waypoint.description,
        weather: weatherResults[index],
        lat: waypoint.lat,
        lng: waypoint.lng
      }));

      setWeatherData(combinedData);
    } catch (err) {
      console.error('Error fetching route weather:', err);
      setError('Failed to load weather data. Please try again.');
      if (onError) onError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data when component mounts or inputs change
  useEffect(() => {
    if (origin && destination) {
      fetchRouteWeather();
    }
  }, [origin, destination]);

  // Handle manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchRouteWeather(true); // Force refresh from API
  };

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading weather data...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchRouteWeather(true)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render empty state
  if (!weatherData.length) {
    return (
      <View style={styles.centerContainer}>
        <Text>No weather data available.</Text>
      </View>
    );
  }

  // Render weather data
  return (
    <View style={styles.container}>
      {route && (
        <View style={styles.routeInfo}>
          <Text style={styles.routeInfoText}>
            Route: {route.distance} ({route.duration})
          </Text>
        </View>
      )}

      <FlatList
        data={weatherData}
        renderItem={({ item }) => (
          <WeatherItem
            weatherData={item.weather}
            location={item.location}
          />
        )}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  routeInfo: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 5,
    borderRadius: 5,
  },
  routeInfoText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RouteWeather;