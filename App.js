/**
 * Weather Along Route App
 * Displays weather data along route segments
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import RouteWeather from './src/components/RouteWeather';
import { clearWeatherCache } from './src/services/weatherService';
import { clearRouteCache } from './src/services/routeService';

// AutocompleteComponent with callback to capture location data
const AutocompleteComponent = ({ placeholder, onLocationSelect }) => {
  return (<GooglePlacesAutocomplete
          placeholder={placeholder}
          minLength={2} // minimum length of text to search
          autoFocus={false}
          fetchDetails={true}
          onPress={(data, details = null) => { // 'details' is provided when fetchDetails = true
            if (details && details.geometry) {
              onLocationSelect({
                description: data.description || details.formatted_address,
                lat: details.geometry.location.lat,
                lng: details.geometry.location.lng
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
            container: {
              width: '100%',
            },
            textInputContainer: {
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
        />)


export default class LandingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      origin: null,
      destination: null,
      showWeather: false,
      loadingRoute: false,
      error: null,
      refreshing: false,
    };
  }

  // Set the origin location
  handleOriginSelect = (location) => {
    this.setState({ origin: location, showWeather: false });
  };

  // Set the destination location
  handleDestinationSelect = (location) => {
    this.setState({ destination: location, showWeather: false });
  };

  // Show weather along the route
  showRouteWeather = () => {
    const { origin, destination } = this.state;

    if (!origin || !destination) {
      this.setState({ error: 'Please select both origin and destination' });
      return;
    }

    this.setState({
      showWeather: true,
      error: null,
      loadingRoute: true
    });

    // RouteWeather component will handle the actual data fetching
    setTimeout(() => {
      this.setState({ loadingRoute: false });
    }, 500);
  };

  // Clear the cache to refresh data
  clearCache = async () => {
    this.setState({ refreshing: true });

    // Clear both caches
    await clearWeatherCache();
    await clearRouteCache();

    this.setState({
      refreshing: false,
      showWeather: false
    });
  };

  // Handle errors from weather component
  handleWeatherError = (errorMsg) => {
    this.setState({ error: errorMsg });
  };

  render() {
    const { origin, destination, showWeather, loadingRoute, error, refreshing } = this.state;

    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Weather Along Route
        </Text>

        <ScrollView style={styles.scrollContainer}>
          <View style={styles.autoContainer}>
            <Text style={styles.sectionLabel}>Starting Location:</Text>
            <AutocompleteComponent
              placeholder="Enter starting location"
              onLocationSelect={this.handleOriginSelect}
            />

            {origin && (
              <Text style={styles.selectedLocation}>
                Selected: {origin.description}
              </Text>
            )}

            <Text style={styles.sectionLabel}>Destination:</Text>
            <AutocompleteComponent
              placeholder="Enter destination"
              onLocationSelect={this.handleDestinationSelect}
            />

            {destination && (
              <Text style={styles.selectedLocation}>
                Selected: {destination.description}
              </Text>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={this.showRouteWeather}
                disabled={!origin || !destination || loadingRoute}
              >
                <Text style={styles.buttonText}>
                  {loadingRoute ? 'Loading...' : 'Show Weather Along Route'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.clearCache}
                disabled={refreshing}
              >
                <Text style={styles.buttonText}>
                  {refreshing ? 'Clearing...' : 'Clear Weather Cache'}
                </Text>
              </TouchableOpacity>
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {showWeather && origin && destination && (
              <View style={styles.weatherContainer}>
                <Text style={styles.weatherTitle}>Weather Along Your Route</Text>
                <RouteWeather
                  origin={origin}
                  destination={destination}
                  onError={this.handleWeatherError}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    paddingTop: 30,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  welcome: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 10,
    color: '#2c3e50',
  },
  autoContainer: {
    padding: 15,
    width: '100%',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  selectedLocation: {
    fontSize: 14,
    color: '#27ae60',
    marginTop: 5,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 15,
  },
  button: {
    padding: 12,
    borderRadius: 5,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginVertical: 10,
  },
  weatherContainer: {
    marginTop: 20,
    width: '100%',
  },
  weatherTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
});

// Register the app component
AppRegistry.registerComponent('WeatherAlongRoute', () => LandingPage);
AppRegistry.registerComponent('test', () => LandingPage);
