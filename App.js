/**
 * Weather Along RizRoute App
 * React Native App with OpenWeatherMap API integration
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
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import WeatherDisplay from './src/components/WeatherDisplay';

// Create the enhanced autocomplete component with proper callbacks
const AutocompleteComponent = ({ placeholder, onLocationSelect }) => {
  return (
    <GooglePlacesAutocomplete
      placeholder={placeholder}
      minLength={2} // minimum length of text to search
      autoFocus={false}
      fetchDetails={true}
      onPress={(data, details = null) => { // 'details' is provided when fetchDetails = true
        // Pass the selected location details back to parent
        if (details && onLocationSelect) {
          onLocationSelect(details);
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
        container: {
          width: '100%',
        },
        description: {
          fontWeight: 'bold',
        },
        predefinedPlacesDescription: {
          color: '#1faadb',
        },
        listView: {
          position: 'absolute',
          top: 45,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderRadius: 5,
          flex: 1,
          elevation: 3,
          zIndex: 1000
        },
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
};

export default class WeatherApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      startLocation: null,
      endLocation: null,
      displayWeather: false,
      selectedLocation: null,
      loading: false,
      error: null
    };
  }

  /**
   * Handle selection of starting location
   * @param {Object} location - Selected location details
   */
  handleStartLocationSelect = (location) => {
    this.setState({
      startLocation: location,
      // When start location is selected, automatically select it for weather display
      selectedLocation: location
    });
  };

  /**
   * Handle selection of destination location
   * @param {Object} location - Selected location details
   */
  handleEndLocationSelect = (location) => {
    this.setState({ endLocation: location });
  };

  /**
   * Toggle displaying weather information
   */
  toggleWeatherDisplay = () => {
    this.setState(prevState => ({
      displayWeather: !prevState.displayWeather
    }));
  };

  /**
   * Select which location to show weather for
   * @param {string} locationType - 'start' or 'end'
   */
  selectLocationForWeather = (locationType) => {
    const { startLocation, endLocation } = this.state;

    if (locationType === 'start' && startLocation) {
      this.setState({ selectedLocation: startLocation });
    } else if (locationType === 'end' && endLocation) {
      this.setState({ selectedLocation: endLocation });
    }
  };

  render() {
    const { startLocation, endLocation, displayWeather, selectedLocation } = this.state;

    // Determine if we have locations selected
    const hasStartLocation = startLocation !== null;
    const hasEndLocation = endLocation !== null;

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={displayWeather ? {} : styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <StatusBar barStyle="dark-content" />

          <View style={styles.header}>
            <Text style={styles.appTitle}>
              Weather Along RizRoute
            </Text>
            {(hasStartLocation || hasEndLocation) && (
              <TouchableOpacity
                style={styles.weatherToggle}
                onPress={this.toggleWeatherDisplay}
              >
                <Text style={styles.weatherToggleText}>
                  {displayWeather ? 'Hide Weather' : 'Show Weather'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Starting Location</Text>
              <AutocompleteComponent
                placeholder="Enter starting location"
                onLocationSelect={this.handleStartLocationSelect}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Final Destination</Text>
              <AutocompleteComponent
                placeholder="Enter destination"
                onLocationSelect={this.handleEndLocationSelect}
              />
            </View>
          </View>

          {displayWeather && (
            <View style={styles.weatherSection}>
              <View style={styles.locationSelector}>
                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    selectedLocation === startLocation ? styles.activeLocation : null
                  ]}
                  disabled={!hasStartLocation}
                  onPress={() => this.selectLocationForWeather('start')}
                >
                  <Text style={styles.locationButtonText}>
                    Starting Point
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    selectedLocation === endLocation ? styles.activeLocation : null
                  ]}
                  disabled={!hasEndLocation}
                  onPress={() => this.selectLocationForWeather('end')}
                >
                  <Text style={styles.locationButtonText}>
                    Destination
                  </Text>
                </TouchableOpacity>
              </View>

              <WeatherDisplay location={selectedLocation} />
            </View>
          )}
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  weatherToggle: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#3498db',
    borderRadius: 5,
  },
  weatherToggleText: {
    color: 'white',
    fontSize: 14,
  },
  inputContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  weatherSection: {
    flex: 1,
    paddingBottom: 20,
  },
  locationSelector: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  locationButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: '#f8f8f8',
  },
  activeLocation: {
    backgroundColor: '#3498db',
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => WeatherApp);
