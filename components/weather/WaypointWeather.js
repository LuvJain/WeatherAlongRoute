/**
 * WaypointWeather.js
 * Displays detailed weather information for a selected waypoint
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated
} from 'react-native';

const { width } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

const WaypointWeather = ({ waypoint, onClose }) => {
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animate the panel sliding in when it receives a waypoint
    if (waypoint) {
      Animated.timing(animation, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: false,
      }).start();
    }
  }, [waypoint]);

  // If no waypoint is selected, don't render
  if (!waypoint) return null;

  // Format the timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate animated styles
  const slideInStyle = {
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [300, 0],
        }),
      },
    ],
    opacity: animation,
  };

  return (
    <Animated.View style={[styles.container, slideInStyle]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {waypoint.location.name || `Waypoint ${waypoint.locationIndex + 1}`}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.mainInfo}>
          <View style={styles.tempContainer}>
            <Text style={styles.temperature}>
              {Math.round(waypoint.temperature.current)}°
            </Text>
            <Text style={styles.feelsLike}>
              Feels like {Math.round(waypoint.temperature.feelsLike)}°
            </Text>
          </View>

          <View style={styles.weatherContainer}>
            <Image
              source={{ uri: waypoint.weather.iconUrl }}
              style={styles.weatherIcon}
            />
            <Text style={styles.weatherDescription}>
              {waypoint.weather.description}
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailTitle}>Humidity</Text>
              <Text style={styles.detailValue}>{waypoint.humidity}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailTitle}>Wind</Text>
              <Text style={styles.detailValue}>
                {Math.round(waypoint.wind.speed)} km/h
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailTitle}>Pressure</Text>
              <Text style={styles.detailValue}>{waypoint.pressure} hPa</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailTitle}>Visibility</Text>
              <Text style={styles.detailValue}>
                {Math.round(waypoint.visibility / 1000)} km
              </Text>
            </View>
          </View>

          {/* Precipitation section, only shown if rain or snow exists */}
          {(waypoint.rain > 0 || waypoint.snow > 0) && (
            <View style={styles.precipitationSection}>
              <Text style={styles.sectionTitle}>Precipitation (last hour)</Text>
              {waypoint.rain > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailTitle}>Rain</Text>
                  <Text style={styles.detailValue}>{waypoint.rain} mm</Text>
                </View>
              )}
              {waypoint.snow > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailTitle}>Snow</Text>
                  <Text style={styles.detailValue}>{waypoint.snow} mm</Text>
                </View>
              )}
            </View>
          )}

          {/* Sun times section */}
          <View style={styles.sunTimesSection}>
            <Text style={styles.sectionTitle}>Sun Times</Text>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailTitle}>Sunrise</Text>
                <Text style={styles.detailValue}>
                  {formatTime(waypoint.sunrise)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailTitle}>Sunset</Text>
                <Text style={styles.detailValue}>
                  {formatTime(waypoint.sunset)}
                </Text>
              </View>
            </View>
          </View>

          {/* Location information */}
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.locationText}>
              Lat: {waypoint.checkpoint.lat.toFixed(4)}, Lng: {waypoint.checkpoint.lng.toFixed(4)}
            </Text>
            {waypoint.location.country && (
              <Text style={styles.countryText}>
                {waypoint.location.country}
              </Text>
            )}
          </View>

          {/* Data timestamp */}
          <Text style={styles.timestampText}>
            Last updated: {formatTime(waypoint.timestamp)}
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    overflow: 'hidden',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#555',
    fontWeight: 'bold',
    marginTop: -2, // Visual adjustment for the × character
  },
  scrollContent: {
    padding: 15,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tempContainer: {
    flex: 1,
  },
  temperature: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  feelsLike: {
    fontSize: 16,
    color: '#666',
  },
  weatherContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  weatherIcon: {
    width: 60,
    height: 60,
  },
  weatherDescription: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
  },
  detailsContainer: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  detailTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  precipitationSection: {
    marginTop: 10,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  sunTimesSection: {
    marginTop: 5,
    marginBottom: 15,
  },
  locationSection: {
    marginTop: 5,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  countryText: {
    fontSize: 14,
    color: '#666',
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 10,
    marginBottom: 5,
  },
});

export default WaypointWeather;