/**
 * WeatherApp - Route Planning Application
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
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Import environment variables
// Note: For React Native, we need to use Platform-specific imports
import { Platform } from 'react-native';

// Access environment variables based on platform
const getEnvVars = () => {
  // For web, we use process.env directly (dotenv loaded via webpack/react-scripts)
  if (Platform.OS === 'web') {
    return {
      GOOGLE_PLACES_API_KEY: process.env.REACT_APP_GOOGLE_PLACES_API_KEY,
      API_URL: process.env.REACT_APP_API_URL,
      WEATHER_API_KEY: process.env.REACT_APP_WEATHER_API_KEY,
    };
  }
  // For React Native, we would import from the .env file (using react-native-dotenv)
  // This requires additional babel config not shown here
  return {
    GOOGLE_PLACES_API_KEY: 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA', // Fallback for now
    API_URL: 'http://localhost:3000',
    WEATHER_API_KEY: 'your_weather_api_key_here',
  };
};



// Enhanced location input component with callback for parent state management
const LocationInput = ({ placeholder, onLocationSelect, defaultValue = '' }) => {
  return (
    <View style={styles.locationInputContainer}>
      <Text style={styles.locationInputLabel}>{placeholder}</Text>
      <GooglePlacesAutocomplete
        placeholder={`Enter ${placeholder.toLowerCase()}`}
        minLength={2}
        autoFocus={false}
        fetchDetails={true}
        onPress={(data, details = null) => {
          // Extract necessary location data for the route
          if (details) {
            const locationData = {
              name: data.description,
              address: details.formatted_address || data.description,
              latitude: details.geometry.location.lat,
              longitude: details.geometry.location.lng,
              placeId: details.place_id
            };

            // Call parent component's callback to update state
            onLocationSelect(locationData);
          }
        }}
        getDefaultValue={() => defaultValue}
        query={{
          key: getEnvVars().GOOGLE_PLACES_API_KEY,
          language: 'en',
          types: 'address',
        }}
        styles={{
          container: styles.autocompleteContainer,
          textInputContainer: styles.textInputContainer,
          textInput: styles.textInput,
          listView: styles.listView,
          description: styles.description,
          predefinedPlacesDescription: styles.predefinedPlacesDescription,
        }}
        currentLocation={true}
        currentLocationLabel="Current location"
        nearbyPlacesAPI='GooglePlacesSearch'
        GoogleReverseGeocodingQuery={{}}
        GooglePlacesSearchQuery={{
          rankby: 'distance',
        }}
        enablePoweredByContainer={false}
        debounce={300}
      />
    </View>
  );
}


export default class LandingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      startLocation: null,
      endLocation: null,
      isLoading: false,
      error: null,
      routeReady: false
    };
  }

  handleStartLocationSelect = (locationData) => {
    this.setState({
      startLocation: locationData,
      routeReady: this.state.endLocation !== null
    });
  }

  handleEndLocationSelect = (locationData) => {
    this.setState({
      endLocation: locationData,
      routeReady: this.state.startLocation !== null
    });
  }

  // Reset both locations
  handleReset = () => {
    this.setState({
      startLocation: null,
      endLocation: null,
      routeReady: false,
      error: null
    });
  }

  // Function to get the route when both locations are selected
  handleGetRoute = () => {
    const { startLocation, endLocation } = this.state;

    if (!startLocation || !endLocation) {
      this.setState({ error: 'Please select both start and end locations' });
      return;
    }

    this.setState({ isLoading: true, error: null });

    // For now just simulate a route calculation
    // In a real app, you would call a routing API here
    setTimeout(() => {
      console.log('Route calculated between:', startLocation, endLocation);
      this.setState({
        isLoading: false,
        routeReady: true
      });
    }, 1500);
  }

  render() {
    const { startLocation, endLocation, isLoading, error, routeReady } = this.state;

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <Text style={styles.welcome}>
              Weather Along Route
            </Text>

            {/* Start location input */}
            <LocationInput
              placeholder="Start Location"
              onLocationSelect={this.handleStartLocationSelect}
              defaultValue={startLocation ? startLocation.address : ''}
            />

            {/* Display selected start location details */}
            {startLocation && (
              <View style={styles.selectedLocationContainer}>
                <Text style={styles.selectedLocationText}>
                  Selected start: {startLocation.name}
                </Text>
              </View>
            )}

            {/* End location input */}
            <LocationInput
              placeholder="Destination"
              onLocationSelect={this.handleEndLocationSelect}
              defaultValue={endLocation ? endLocation.address : ''}
            />

            {/* Display selected end location details */}
            {endLocation && (
              <View style={styles.selectedLocationContainer}>
                <Text style={styles.selectedLocationText}>
                  Selected destination: {endLocation.name}
                </Text>
              </View>
            )}

            {/* Error message display */}
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.resetButton]}
                onPress={this.handleReset}
              >
                <Text style={styles.buttonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.routeButton,
                  (!startLocation || !endLocation) && styles.buttonDisabled
                ]}
                onPress={this.handleGetRoute}
                disabled={!startLocation || !endLocation || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Get Route</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Route status */}
            {routeReady && (
              <View style={styles.routeReadyContainer}>
                <Text style={styles.routeReadyText}>
                  Route from {startLocation.name} to {endLocation.name} is ready!
                </Text>
                <Text style={styles.routeInfoText}>
                  Weather information will be displayed along this route.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#2c3e50',
  },
  locationInputContainer: {
    marginBottom: 20,
    width: '100%',
    zIndex: 1, // Ensure autocomplete dropdown shows above other elements
  },
  locationInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#34495e',
  },
  autocompleteContainer: {
    flex: 0,
    width: '100%',
    zIndex: 1,
  },
  textInputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    height: 46,
    color: '#333',
    fontSize: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  listView: {
    borderRadius: 8,
    backgroundColor: '#fff',
    marginHorizontal: 0,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  description: {
    fontWeight: '500',
    fontSize: 15,
  },
  predefinedPlacesDescription: {
    color: '#1faadb',
  },
  selectedLocationContainer: {
    backgroundColor: '#e8f4f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  selectedLocationText: {
    fontSize: 14,
    color: '#2980b9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  resetButton: {
    backgroundColor: '#95a5a6',
  },
  routeButton: {
    backgroundColor: '#3498db',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginVertical: 10,
  },
  routeReadyContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#d5f5e3',
    borderRadius: 8,
    width: '100%',
  },
  routeReadyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: 8,
  },
  routeInfoText: {
    fontSize: 14,
    color: '#2c3e50',
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => LandingPage);
AppRegistry.registerComponent('autocompleteComponent', (placeholder) => LandingPage);
