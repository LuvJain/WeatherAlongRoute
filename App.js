/**
 * Weather Along RizRoute - Main App Component
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import LocationInput from './components/LocationInput';
import type { Location } from './models/Location';

type Props = {};

type State = {
  startLocation: ?Location,
  endLocation: ?Location,
  showStartForm: boolean,
  showEndForm: boolean,
  error?: string,
};

export default class LandingPage extends Component<Props, State> {
  // Google Places API Key - Replace with your actual key
  googlePlacesApiKey = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA';

  constructor(props: Props) {
    super(props);
    this.state = {
      startLocation: null,
      endLocation: null,
      showStartForm: false,
      showEndForm: false,
      error: null,
    };
  }

  /**
   * Handle start location selection
   */
  handleStartLocationSelect = (location: Location) => {
    this.setState({
      startLocation: location,
      showStartForm: false,
    });
    console.log('Start location selected:', location);
  };

  /**
   * Handle end location selection
   */
  handleEndLocationSelect = (location: Location) => {
    this.setState({
      endLocation: location,
      showEndForm: false,
    });
    console.log('End location selected:', location);
  };

  /**
   * Handle location error
   */
  handleLocationError = (error: string) => {
    this.setState({ error });
    console.warn('Location error:', error);
  };

  /**
   * Handle form submission
   */
  handleSubmit = () => {
    const { startLocation, endLocation } = this.state;

    if (!startLocation || !endLocation) {
      this.setState({ error: 'Please select both starting and ending locations' });
      return;
    }

    // Log the route
    console.log('Route selected:', {
      start: startLocation,
      end: endLocation,
    });

    // TODO: Navigate to next screen or process the route
    this.setState({ error: null });
  };

  /**
   * Clear start location
   */
  handleClearStart = () => {
    this.setState({ startLocation: null, showStartForm: true });
  };

  /**
   * Clear end location
   */
  handleClearEnd = () => {
    this.setState({ endLocation: null, showEndForm: true });
  };

  render() {
    const {
      startLocation,
      endLocation,
      showStartForm,
      showEndForm,
      error,
    } = this.state;

    return (
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.welcome}>
            Welcome to Weather Along RizRoute
          </Text>
          <Text style={styles.subtitle}>
            Plan your route and check the weather along the way
          </Text>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* Starting Location Section */}
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Starting Location</Text>

            {startLocation && !showStartForm ? (
              <View style={styles.locationCard}>
                <View style={styles.locationContent}>
                  <Text style={styles.selectedLocation}>
                    📍 {startLocation.place}
                  </Text>
                  {!startLocation.validated && (
                    <Text style={styles.offlineIndicator}>
                      Offline - Not validated
                    </Text>
                  )}
                  <Text style={styles.coordinates}>
                    {startLocation.latitude.toFixed(4)}, {startLocation.longitude.toFixed(4)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={this.handleClearStart}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formContainer}>
                <LocationInput
                  placeholder="Enter starting location..."
                  onLocationSelect={this.handleStartLocationSelect}
                  onError={this.handleLocationError}
                  googlePlacesApiKey={this.googlePlacesApiKey}
                  testID="start_location"
                />
              </View>
            )}
          </View>

          {/* Destination Section */}
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Final Destination</Text>

            {endLocation && !showEndForm ? (
              <View style={styles.locationCard}>
                <View style={styles.locationContent}>
                  <Text style={styles.selectedLocation}>
                    🎯 {endLocation.place}
                  </Text>
                  {!endLocation.validated && (
                    <Text style={styles.offlineIndicator}>
                      Offline - Not validated
                    </Text>
                  )}
                  <Text style={styles.coordinates}>
                    {endLocation.latitude.toFixed(4)}, {endLocation.longitude.toFixed(4)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={this.handleClearEnd}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formContainer}>
                <LocationInput
                  placeholder="Enter destination..."
                  onLocationSelect={this.handleEndLocationSelect}
                  onError={this.handleLocationError}
                  googlePlacesApiKey={this.googlePlacesApiKey}
                  testID="end_location"
                />
              </View>
            )}
          </View>

          {/* Submit Button */}
          {startLocation && endLocation && (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={this.handleSubmit}
            >
              <Text style={styles.submitButtonText}>
                Get Weather for Route
              </Text>
            </TouchableOpacity>
          )}

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How it works:</Text>
            <Text style={styles.infoBullet}>
              📍 Use GPS detection for quick current location
            </Text>
            <Text style={styles.infoBullet}>
              🔍 Search for addresses using Google Places
            </Text>
            <Text style={styles.infoBullet}>
              💾 Recently used locations are saved automatically
            </Text>
            <Text style={styles.infoBullet}>
              📵 Works offline - locations will be validated when back online
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEEBA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#856404',
    fontSize: 14,
  },
  locationSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  formContainer: {
    maxHeight: 400,
  },
  locationCard: {
    backgroundColor: '#FFF',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationContent: {
    flex: 1,
  },
  selectedLocation: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  offlineIndicator: {
    fontSize: 12,
    color: '#FF9500',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 12,
    color: '#999',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#E8F4F8',
    borderColor: '#B8D4E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 8,
  },
  infoBullet: {
    fontSize: 13,
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => LandingPage);
