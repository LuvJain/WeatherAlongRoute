/**
 * Weather Along Route App
 * Displays weather information along a travel route
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import RouteWeatherInfo from './src/components/RouteWeatherInfo';
import { getRouteWeather } from './src/services/routeWeatherService';

/**
 * Google Places Autocomplete component with consistent styling
 * @param {String} placeholder - Placeholder text for the input
 * @param {Function} onLocationSelected - Callback for when a location is selected
 * @returns {JSX.Element} - Autocomplete component
 */
const AutocompleteComponent = ({ placeholder, onLocationSelected }) => {
  return (
    <GooglePlacesAutocomplete
      placeholder={placeholder}
      minLength={2}
      autoFocus={false}
      fetchDetails={true}
      onPress={(data, details = null) => {
        if (details && details.geometry && details.geometry.location) {
          onLocationSelected({
            description: data.description,
            location: {
              lat: details.geometry.location.lat,
              lng: details.geometry.location.lng
            }
          });
        }
      }}
      getDefaultValue={() => {
        return ''; // text input default value
      }}
      query={{
        key: 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA',
        language: 'en',
        types: 'address',
      }}
      styles={{
        container: {
          flex: 0,
          width: '100%',
          marginBottom: 10,
          zIndex: 1,
        },
        description: {
          fontWeight: 'bold',
        },
        predefinedPlacesDescription: {
          color: '#1faadb',
        },
        textInputContainer: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: '#ddd',
        },
        textInput: {
          height: 38,
          color: '#5d5d5d',
          fontSize: 16,
        },
        listView: {
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: '#ddd',
          borderTopWidth: 0,
          marginTop: -1,
        }
      }}
      currentLocation={true}
      currentLocationLabel="Current location"
      nearbyPlacesAPI='GooglePlacesSearch'
      GooglePlacesSearchQuery={{
        rankby: 'distance',
      }}
    />
  );
};

export default class WeatherAlongRoute extends Component {
  constructor(props) {
    super(props);
    this.state = {
      startLocation: null,
      endLocation: null,
      routeWeather: null,
      loading: false,
      error: null
    };
  }

  /**
   * Handle start location selection
   * @param {Object} location - Selected location object
   */
  handleStartLocationSelected = (location) => {
    this.setState({ startLocation: location });
  };

  /**
   * Handle end location selection
   * @param {Object} location - Selected location object
   */
  handleEndLocationSelected = (location) => {
    this.setState({ endLocation: location });
  };

  /**
   * Get weather for the selected route
   */
  getWeatherForRoute = async () => {
    const { startLocation, endLocation } = this.state;

    if (!startLocation || !endLocation) {
      Alert.alert('Missing Information', 'Please select both a starting point and a destination');
      return;
    }

    this.setState({ loading: true, error: null });

    try {
      const routeWeather = await getRouteWeather(
        startLocation.location,
        endLocation.location
      );

      this.setState({ routeWeather, loading: false });
    } catch (error) {
      console.error('Error fetching route weather:', error);
      this.setState({
        error: 'Failed to fetch route weather information. Please try again.',
        loading: false
      });
    }
  };

  render() {
    const { startLocation, endLocation, routeWeather, loading, error } = this.state;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.welcome}>
              Weather Along Route
            </Text>
            <Text style={styles.subtitle}>
              Get weather forecasts for your journey
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Starting Point:</Text>
            <AutocompleteComponent
              placeholder="Enter starting location"
              onLocationSelected={this.handleStartLocationSelected}
            />

            <Text style={styles.inputLabel}>Destination:</Text>
            <AutocompleteComponent
              placeholder="Enter destination"
              onLocationSelected={this.handleEndLocationSelected}
            />

            <TouchableOpacity
              style={[
                styles.button,
                (!startLocation || !endLocation) && styles.buttonDisabled,
                loading && styles.buttonLoading
              ]}
              onPress={this.getWeatherForRoute}
              disabled={!startLocation || !endLocation || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Get Route Weather</Text>
              )}
            </TouchableOpacity>
          </View>

          {(routeWeather || loading || error) && (
            <View style={styles.resultsContainer}>
              <RouteWeatherInfo
                routeWeather={routeWeather}
                loading={loading}
                error={error}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4a90e2',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  inputContainer: {
    padding: 15,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  inputLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10,
  },
  button: {
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    alignSelf: 'center',
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonLoading: {
    backgroundColor: '#7eb0eb',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
    marginTop: 20,
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => WeatherAlongRoute);
