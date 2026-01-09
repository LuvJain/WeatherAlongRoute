/**
 * Example integration of WeatherService with the LandingPage component
 * This shows how to use the weather service to fetch weather data
 * for the starting location and final destination
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { weatherService } from './weatherService';

class WeatherAlongRoute extends Component {
  state = {
    startingLocation: null,
    finalDestination: null,
    startingWeather: null,
    destinationWeather: null,
    loading: false,
    error: null,
  };

  /**
   * Handle location selection and fetch weather data
   */
  handleLocationSelect = async (data, details, type) => {
    try {
      const { description } = data;
      const key = type === 'start' ? 'startingLocation' : 'finalDestination';

      this.setState({
        [key]: description,
        loading: true,
        error: null,
      });

      // Fetch weather data for the selected location
      const weather = await weatherService.getWeather([description]);

      if (weather[description]) {
        const weatherKey =
          type === 'start' ? 'startingWeather' : 'destinationWeather';
        this.setState({
          [weatherKey]: weather[description],
          loading: false,
        });
      }
    } catch (error) {
      this.setState({
        error: 'Failed to fetch weather data. Request queued for offline processing.',
        loading: false,
      });
      console.error('Weather fetch error:', error);
    }
  };

  /**
   * Render weather information card
   */
  renderWeatherCard = (location, weather) => {
    if (!weather) return null;

    return (
      <View style={styles.weatherCard}>
        <Text style={styles.locationTitle}>{location}</Text>
        <View style={styles.weatherRow}>
          <Text style={styles.label}>Temperature:</Text>
          <Text style={styles.value}>{weather.temperature}°F</Text>
        </View>
        <View style={styles.weatherRow}>
          <Text style={styles.label}>Condition:</Text>
          <Text style={styles.value}>{weather.condition}</Text>
        </View>
        <View style={styles.weatherRow}>
          <Text style={styles.label}>Humidity:</Text>
          <Text style={styles.value}>{weather.humidity}%</Text>
        </View>
        <View style={styles.weatherRow}>
          <Text style={styles.label}>Wind Speed:</Text>
          <Text style={styles.value}>{weather.windSpeed} mph</Text>
        </View>
        <Text style={styles.timestamp}>
          Fetched: {new Date(weather.fetchTimestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  /**
   * Render autocomplete component for location selection
   */
  renderAutocompleteComponent = (placeholder, type) => {
    return (
      <GooglePlacesAutocomplete
        placeholder={placeholder}
        minLength={2}
        autoFocus={false}
        fetchDetails={true}
        onPress={(data, details = null) => {
          this.handleLocationSelect(data, details, type);
        }}
        getDefaultValue={() => ''}
        query={{
          key: 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA',
          language: 'en',
          types: 'address',
        }}
        styles={{
          description: {
            fontWeight: 'bold',
          },
          predefinedPlacesDescription: {
            color: '#1faadb',
          },
        }}
        currentLocation={true}
        currentLocationLabel="Current location"
        nearbyPlacesAPI="GooglePlacesSearch"
        GoogleReverseGeocodingQuery={{}}
        GooglePlacesSearchQuery={{
          rankby: 'distance',
        }}
      />
    );
  };

  render() {
    const {
      startingWeather,
      destinationWeather,
      loading,
      error,
    } = this.state;

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Weather Along Route</Text>

        <View style={styles.autoContainer}>
          {this.renderAutocompleteComponent('Starting Location', 'start')}
          {this.renderAutocompleteComponent('Final Destination', 'destination')}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Fetching weather data...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {startingWeather &&
          this.renderWeatherCard('Starting Location', startingWeather)}
        {destinationWeather &&
          this.renderWeatherCard('Final Destination', destinationWeather)}

        {(startingWeather || destinationWeather) && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Weather data is cached for 120 minutes. Requests made while offline
              will be automatically processed when your connection is restored.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  autoContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  weatherCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976D2',
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontWeight: '600',
    color: '#666',
  },
  value: {
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 4,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 4,
  },
  infoText: {
    color: '#1976D2',
    fontSize: 14,
    lineHeight: 20,
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => WeatherAlongRoute);

export default WeatherAlongRoute;
