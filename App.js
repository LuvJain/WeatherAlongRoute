/**
 * Weather Along Route App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Import our services
import routeWeatherService from './services/route_weather_service';
import logger from './services/utils/logger';

// Autocomplete component for location input
const autocompleteComponent = (placeholder, onLocationSelect) => {
  return (
    <GooglePlacesAutocomplete
      placeholder={placeholder}
      minLength={2} // minimum length of text to search
      autoFocus={false}
      fetchDetails={true}
      onPress={(data, details = null) => { // 'details' is provided when fetchDetails = true
        // Call the onLocationSelect callback with the selected location details
        if (onLocationSelect && details) {
          onLocationSelect({
            placeId: data.place_id,
            description: data.description,
            coordinates: {
              lat: details.geometry.location.lat,
              lng: details.geometry.location.lng
            },
            address: details.formatted_address
          });
        }
      }}
      getDefaultValue={() => {
        return ''; // text input default value
      }}
      query={{
        // available options: https://developers.google.com/places/web-service/autocomplete
        key: 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA',
        language: 'en', // language of the results
        types: 'address', // default: 'geocode'
      }}
      styles={{
        description: {
          fontWeight: 'bold',
        },
        predefinedPlacesDescription: {
          color: '#1faadb',
        },
        textInputContainer: {
          width: '100%',
        },
        container: {
          width: '100%',
        }
      }}
      currentLocation={true} // Will add a 'Current location' button at the top of the predefined places list
      currentLocationLabel="Current location"
      nearbyPlacesAPI='GooglePlacesSearch' // Which API to use: GoogleReverseGeocoding or GooglePlacesSearch
      GoogleReverseGeocodingQuery={{
        // available options for GoogleReverseGeocoding API : https://developers.google.com/maps/documentation/geocoding/intro
      }}
      GooglePlacesSearchQuery={{
        // available options for GooglePlacesSearch API : https://developers.google.com/places/web-service/search
        rankby: 'distance',
      }}
    />
  );
}

// Weather summary component
const WeatherSummary = ({ weather }) => {
  if (!weather) return null;

  return (
    <View style={styles.weatherContainer}>
      <Text style={styles.weatherTitle}>{weather.location.name}</Text>
      <Text style={styles.weatherDescription}>{weather.weather.description}</Text>
      <Text style={styles.temperature}>{Math.round(weather.temperature.current)}°</Text>
      <Text style={styles.weatherDetails}>
        Humidity: {weather.humidity}% | Wind: {Math.round(weather.wind.speed)} km/h
      </Text>
    </View>
  );
};

// Route weather point component
const RouteWeatherPoint = ({ point, index }) => {
  return (
    <View style={styles.routePointContainer}>
      <Text style={styles.routePointTitle}>Checkpoint {index + 1}</Text>
      <Text style={styles.routePointLocation}>{point.location.name || 'Location'}</Text>
      <Text style={styles.routePointWeather}>{point.weather.description}</Text>
      <Text style={styles.routePointTemp}>{Math.round(point.temperature.current)}°</Text>
    </View>
  );
};

export default class LandingPage extends Component {
  state = {
    startLocation: null,
    endLocation: null,
    isLoading: false,
    route: null,
    routeWeather: null,
    error: null
  };

  handleStartLocationSelect = (location) => {
    this.setState({ startLocation: location });
    logger.info('Start location selected', { location });
  };

  handleEndLocationSelect = (location) => {
    this.setState({ endLocation: location });
    logger.info('End location selected', { location });
  };

  getRouteWithWeather = async () => {
    const { startLocation, endLocation } = this.state;

    // Validate locations
    if (!startLocation || !endLocation) {
      Alert.alert('Missing Information', 'Please select both starting and ending locations');
      return;
    }

    try {
      this.setState({ isLoading: true, error: null });

      logger.info('Fetching route with weather', {
        start: startLocation.description,
        end: endLocation.description
      });

      // Call our route weather service
      const result = await routeWeatherService.getRouteWithWeather(
        startLocation.coordinates,
        endLocation.coordinates
      );

      if (result.status === 'OK' && result.route) {
        this.setState({
          route: result.route,
          routeWeather: result.route.weather,
          isLoading: false
        });

        logger.info('Route and weather data received', {
          distance: result.route.distance.text,
          duration: result.route.duration.text,
          weatherPoints: result.route.weather.length
        });
      } else {
        this.setState({
          error: result.error || 'Failed to get route information',
          isLoading: false
        });
        logger.error('Error fetching route', { error: result.error });
      }
    } catch (error) {
      this.setState({
        error: error.message,
        isLoading: false
      });
      logger.error('Exception while fetching route', error);
    }
  };

  render() {
    const { startLocation, endLocation, isLoading, route, routeWeather, error } = this.state;

    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Weather Along Route
        </Text>

        <View style={styles.autoContainer}>
          <Text style={styles.inputLabel}>Starting Location:</Text>
          {autocompleteComponent('Enter starting location', this.handleStartLocationSelect)}

          <Text style={styles.inputLabel}>Destination:</Text>
          {autocompleteComponent('Enter destination', this.handleEndLocationSelect)}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={this.getRouteWithWeather}
          disabled={isLoading || !startLocation || !endLocation}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get Route Weather</Text>
          )}
        </TouchableOpacity>

        {error && (
          <Text style={styles.errorText}>Error: {error}</Text>
        )}

        {route && (
          <View style={styles.routeContainer}>
            <Text style={styles.routeTitle}>Route Information</Text>
            <Text style={styles.routeDetails}>
              Distance: {route.distance.text} | Duration: {route.duration.text}
            </Text>

            <Text style={styles.weatherTitle}>Weather Along Route:</Text>

            <ScrollView style={styles.weatherScroll}>
              {routeWeather && routeWeather.map((point, index) => (
                <RouteWeatherPoint key={index} point={point} index={index} />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    padding: 10,
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
    fontWeight: 'bold',
  },
  autoContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#1faadb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  },
  routeContainer: {
    width: '100%',
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    flex: 1,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  routeDetails: {
    marginBottom: 10,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  weatherScroll: {
    flex: 1,
    width: '100%',
  },
  weatherContainer: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 10,
  },
  weatherDescription: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  temperature: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  weatherDetails: {
    marginTop: 5,
    fontSize: 12,
  },
  routePointContainer: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 10,
  },
  routePointTitle: {
    fontWeight: 'bold',
  },
  routePointLocation: {
    fontSize: 14,
  },
  routePointWeather: {
    textTransform: 'capitalize',
  },
  routePointTemp: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => LandingPage);
