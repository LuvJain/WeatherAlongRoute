/**
 * WeatherItem - Component for displaying weather data for a single location
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getIconForCondition, getColorForTemperature } from '../utils/weatherIcons';

const WeatherItem = ({ weatherData, location }) => {
  // Early return if no data
  if (!weatherData || !weatherData.main) {
    return (
      <View style={styles.container}>
        <Text style={styles.locationName}>No data available for {location || 'this location'}</Text>
      </View>
    );
  }

  // Extract data from the weather object
  const { main, weather, wind } = weatherData;
  const temperature = Math.round(main.temp);
  const weatherCondition = weather[0];
  const windSpeed = wind.speed;
  const precipitation = weatherData.rain
    ? weatherData.rain['1h'] || weatherData.rain['3h'] || 0
    : 0;

  // Get the icon for the current weather condition
  const icon = getIconForCondition(weatherCondition.id);
  const bgColor = getColorForTemperature(temperature);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={styles.locationName}>{location || 'Current Location'}</Text>

      <View style={styles.weatherContent}>
        <Text style={styles.temperature}>{temperature}°C</Text>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.description}>{weatherCondition.description}</Text>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Text style={styles.detailTitle}>Wind</Text>
          <Text style={styles.detailValue}>{windSpeed} m/s</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailTitle}>Precip</Text>
          <Text style={styles.detailValue}>{precipitation} mm</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailTitle}>Humidity</Text>
          <Text style={styles.detailValue}>{main.humidity}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    padding: 15,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  weatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  temperature: {
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 10,
  },
  icon: {
    fontSize: 28,
    marginRight: 10,
  },
  description: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 10,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 12,
    color: '#555',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default WeatherItem;