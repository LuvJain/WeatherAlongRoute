/**
 * WeatherOverlay.js
 * Displays a visual overlay of weather conditions on the map
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { Marker, Callout, Circle } from 'react-native-maps';

// Helper function to determine appropriate weather icon color
const getWeatherIconColor = (weather) => {
  if (!weather) return 'yellow';

  // Determine color based on weather condition
  if (weather.main === 'Rain' || weather.main === 'Drizzle' || weather.main === 'Thunderstorm') {
    return 'blue';
  } else if (weather.main === 'Snow') {
    return 'white';
  } else if (weather.main === 'Clear') {
    return 'yellow';
  } else if (weather.main === 'Clouds') {
    return 'gray';
  } else if (weather.main === 'Mist' || weather.main === 'Fog') {
    return 'lightgray';
  }
  return 'yellow'; // default
};

// Helper function to determine radius based on severity
const getWeatherCircleRadius = (weather) => {
  if (!weather) return 5000; // Default: 5km

  // Precipitation intensity affects radius
  if (weather.rain > 20 || weather.snow > 20) {
    return 15000; // Heavy precipitation: 15km
  } else if (weather.rain > 10 || weather.snow > 10) {
    return 10000; // Moderate precipitation: 10km
  } else if (weather.rain > 0 || weather.snow > 0) {
    return 7500; // Light precipitation: 7.5km
  }

  // Wind speed affects radius
  if (weather.wind.speed > 30) {
    return 20000; // Strong wind: 20km
  } else if (weather.wind.speed > 15) {
    return 12000; // Moderate wind: 12km
  }

  // Default for other weather types
  return 5000; // 5km
};

// Helper function to determine opacity based on weather intensity
const getWeatherOpacity = (weather) => {
  if (!weather) return 0.2;

  // Determine opacity based on weather intensity
  if (weather.main === 'Thunderstorm') {
    return 0.4;
  } else if (weather.main === 'Rain') {
    return weather.rain > 10 ? 0.4 : 0.3; // Heavier rain = more opaque
  } else if (weather.main === 'Snow') {
    return weather.snow > 10 ? 0.4 : 0.3;
  } else if (weather.main === 'Clouds') {
    return 0.2; // Clouds are more transparent
  }

  return 0.2; // default
};

const WeatherOverlay = ({ weatherPoints, selectedWaypoint, onSelectWaypoint }) => {
  if (!weatherPoints || weatherPoints.length === 0) {
    return null;
  }

  return (
    <>
      {/* Weather condition circles for each point */}
      {weatherPoints.map((point, index) => {
        const isSelected = selectedWaypoint && selectedWaypoint.locationIndex === index;
        const circleRadius = getWeatherCircleRadius(point);
        const circleColor = getWeatherIconColor(point.weather);
        const circleOpacity = getWeatherOpacity(point.weather);

        return (
          <React.Fragment key={`weather-${index}`}>
            {/* Weather condition circle */}
            <Circle
              center={{
                latitude: point.checkpoint.lat,
                longitude: point.checkpoint.lng
              }}
              radius={circleRadius}
              fillColor={`rgba(${circleColor === 'blue' ? '0,0,255' :
                              circleColor === 'white' ? '255,255,255' :
                              circleColor === 'yellow' ? '255,215,0' :
                              circleColor === 'gray' ? '128,128,128' :
                              circleColor === 'lightgray' ? '211,211,211' :
                              '0,0,0'}, ${circleOpacity})`}
              strokeWidth={isSelected ? 2 : 0}
              strokeColor="#000"
              zIndex={isSelected ? 2 : 1}
            />

            {/* Weather icon marker */}
            <Marker
              coordinate={{
                latitude: point.checkpoint.lat,
                longitude: point.checkpoint.lng
              }}
              onPress={() => onSelectWaypoint(point)}
              opacity={0.9}
              zIndex={3}
            >
              <View style={styles.weatherIconContainer}>
                <Image
                  style={styles.weatherIcon}
                  source={{ uri: point.weather.iconUrl }}
                  resizeMode="contain"
                />
                <Text style={styles.temperatureText}>
                  {Math.round(point.temperature.current)}°
                </Text>
              </View>

              <Callout tooltip style={styles.callout}>
                <View style={styles.calloutContent}>
                  <Text style={styles.calloutTitle}>{point.location.name || `Waypoint ${index + 1}`}</Text>
                  <Text style={styles.calloutDescription}>
                    {point.weather.description}
                  </Text>
                  <Text style={styles.calloutTemperature}>
                    {Math.round(point.temperature.current)}°
                  </Text>
                  <Text style={styles.calloutDetails}>
                    Humidity: {point.humidity}% | Wind: {Math.round(point.wind.speed)} km/h
                  </Text>
                </View>
              </Callout>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  weatherIconContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  weatherIcon: {
    width: 30,
    height: 30,
  },
  temperatureText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  callout: {
    width: 200,
    borderRadius: 10,
    overflow: 'hidden',
  },
  calloutContent: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  calloutDescription: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  calloutTemperature: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  calloutDetails: {
    fontSize: 10,
    color: '#666',
  }
});

export default WeatherOverlay;