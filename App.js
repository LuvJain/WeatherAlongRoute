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
  ScrollView,
} from 'react-native';
import LocationInputContainer from './components/LocationInputContainer';
import type { Location } from './models/Location';

const GOOGLE_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA';

export default class LandingPage extends Component<
  {},
  {
    startingLocation: ?Location,
    destinationLocation: ?Location,
  }
> {
  startingLocationRef: ?any;
  destinationLocationRef: ?any;

  constructor(props: {}) {
    super(props);
    this.state = {
      startingLocation: null,
      destinationLocation: null,
    };
  }

  /**
   * Handle starting location selection
   */
  handleStartingLocationSelect = (location: Location) => {
    this.setState({ startingLocation: location });
    console.log('Starting location selected:', location);
  };

  /**
   * Handle destination location selection
   */
  handleDestinationLocationSelect = (location: Location) => {
    this.setState({ destinationLocation: location });
    console.log('Destination location selected:', location);
  };

  render() {
    const { startingLocation, destinationLocation } = this.state;

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.welcome}>Welcome to Weather Along RizRoute</Text>

        {/* Starting Location Input */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Starting Location</Text>
          <LocationInputContainer
            ref={(ref) => {
              this.startingLocationRef = ref;
            }}
            googleApiKey={GOOGLE_API_KEY}
            onLocationSelect={this.handleStartingLocationSelect}
            placeholder="Enter starting location"
            style={styles.locationInputContainer}
          />
        </View>

        {/* Destination Location Input */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Destination</Text>
          <LocationInputContainer
            ref={(ref) => {
              this.destinationLocationRef = ref;
            }}
            googleApiKey={GOOGLE_API_KEY}
            onLocationSelect={this.handleDestinationLocationSelect}
            placeholder="Enter destination"
            style={styles.locationInputContainer}
          />
        </View>

        {/* Selected Locations Summary */}
        {(startingLocation || destinationLocation) && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Selected Locations Summary</Text>
            {startingLocation && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>From:</Text>
                <Text style={styles.summaryValue}>
                  {startingLocation.address}
                </Text>
                <Text style={styles.summaryCoords}>
                  {startingLocation.latitude.toFixed(4)},{' '}
                  {startingLocation.longitude.toFixed(4)}
                </Text>
              </View>
            )}
            {destinationLocation && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>To:</Text>
                <Text style={styles.summaryValue}>
                  {destinationLocation.address}
                </Text>
                <Text style={styles.summaryCoords}>
                  {destinationLocation.latitude.toFixed(4)},{' '}
                  {destinationLocation.longitude.toFixed(4)}
                </Text>
              </View>
            )}
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
    paddingTop: 16,
    paddingBottom: 16,
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
    fontWeight: '600',
    color: '#333333',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  locationInputContainer: {
    height: 300,
  },
  summaryContainer: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 12,
  },
  summaryItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  summaryCoords: {
    fontSize: 12,
    color: '#999999',
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => LandingPage);
