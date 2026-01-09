/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  ScrollView
} from 'react-native';
import LocationInput from './src/components/LocationInput';
import LocationValidationService from './src/services/LocationValidationService';
import type { Location } from './src/models/types';

const GOOGLE_PLACES_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA';

type State = {
  startLocation: ?Location,
  endLocation: ?Location,
  validationStatus: string
};

/**
 * Main App component
 * Integrates LocationInput components for start and end locations
 * Manages location state and validation
 */
export default class LandingPage extends Component<{}, State> {
  validationService: LocationValidationService;

  constructor(props: any) {
    super(props);
    this.state = {
      startLocation: null,
      endLocation: null,
      validationStatus: 'ready'
    };

    // Get singleton instance of validation service
    this.validationService = LocationValidationService.getInstance();
  }

  componentDidMount() {
    // Start the validation service
    this.validationService.start();

    // Add listener for online status changes
    this.unsubscribeOnlineStatus = this.validationService.addOnlineStatusListener(
      (isOnline) => {
        this.setState({
          validationStatus: isOnline ? 'online' : 'offline'
        });

        // If coming online, validate pending locations
        if (isOnline) {
          this.validationService.validatePendingLocations(GOOGLE_PLACES_API_KEY);
        }
      }
    );
  }

  componentWillUnmount() {
    // Stop validation service and remove listeners
    this.validationService.stop();
    if (this.unsubscribeOnlineStatus) {
      this.unsubscribeOnlineStatus();
    }
  }

  /**
   * Handle start location selection
   */
  handleStartLocationSelected = (location: Location) => {
    this.setState({ startLocation: location });
  };

  /**
   * Handle end location selection
   */
  handleEndLocationSelected = (location: Location) => {
    this.setState({ endLocation: location });
  };

  render() {
    const { startLocation, endLocation, validationStatus } = this.state;

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to Weather Along RizRoute
        </Text>

        {/* Validation status indicator */}
        <View style={[
          styles.statusIndicator,
          { backgroundColor: validationStatus === 'online' ? '#4CAF50' : '#FF9800' }
        ]}>
          <Text style={styles.statusText}>
            {validationStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
          </Text>
        </View>

        {/* Starting Location Input */}
        <View style={styles.locationSection}>
          <Text style={styles.locationLabel}>Starting Location</Text>
          <LocationInput
            googlePlacesApiKey={GOOGLE_PLACES_API_KEY}
            onLocationSelected={this.handleStartLocationSelected}
            placeholder="Enter starting location"
          />
          {startLocation && (
            <View style={styles.selectedLocationInfo}>
              <Text style={styles.selectedLocationText}>
                Selected: {startLocation.name}
              </Text>
              <Text style={styles.validationIndicator}>
                {startLocation.validated ? '✓ Validated' : '⏳ Pending validation'}
              </Text>
            </View>
          )}
        </View>

        {/* Final Destination Input */}
        <View style={styles.locationSection}>
          <Text style={styles.locationLabel}>Final Destination</Text>
          <LocationInput
            googlePlacesApiKey={GOOGLE_PLACES_API_KEY}
            onLocationSelected={this.handleEndLocationSelected}
            placeholder="Enter final destination"
          />
          {endLocation && (
            <View style={styles.selectedLocationInfo}>
              <Text style={styles.selectedLocationText}>
                Selected: {endLocation.name}
              </Text>
              <Text style={styles.validationIndicator}>
                {endLocation.validated ? '✓ Validated' : '⏳ Pending validation'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    paddingTop: 20
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
    fontWeight: 'bold',
    color: '#333'
  },
  statusIndicator: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center'
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  locationSection: {
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginHorizontal: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  selectedLocationInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  selectedLocationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  validationIndicator: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500'
  }
});

AppRegistry.registerComponent('WeatherAlongRoute', () => LandingPage);
