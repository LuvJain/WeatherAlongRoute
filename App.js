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
  TextInput,
  ScrollView,
} from 'react-native';
import LocationInput from './src/components/LocationInput';
import type { Location } from './src/models/Location';

type State = {
  startLocation: ?Location,
  endLocation: ?Location,
};

export default class WeatherAlongRoute extends Component<{}, State> {
  constructor(props: any) {
    super(props);

    this.state = {
      startLocation: null,
      endLocation: null,
    };
  }

  /**
   * Handle starting location selection
   */
  handleStartLocationSelect = (location: Location) => {
    this.setState({ startLocation: location });
    console.log('Start location selected:', location);
  };

  /**
   * Handle ending location selection
   */
  handleEndLocationSelect = (location: Location) => {
    this.setState({ endLocation: location });
    console.log('End location selected:', location);
  };

  render() {
    const { startLocation, endLocation } = this.state;

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to Weather Along RizRoute
        </Text>
        <Text style={styles.subtitle}>
          Select your starting location and destination
        </Text>

        {/* Starting Location Input */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Starting Location</Text>
          <LocationInput
            placeholder="Enter starting location"
            onLocationSelect={this.handleStartLocationSelect}
          />
        </View>

        {/* Selected Starting Location */}
        {startLocation && (
          <View style={styles.selectedInfoContainer}>
            <Text style={styles.selectedLabel}>
              Selected Start:
            </Text>
            <Text style={styles.selectedName}>{startLocation.name}</Text>
            <Text style={styles.selectedAddress}>
              {startLocation.address}
            </Text>
            <Text style={styles.validationIndicator}>
              {startLocation.validated ? '✓ Validated' : '⚠ Pending Validation'}
            </Text>
          </View>
        )}

        {/* Ending Location Input */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Destination</Text>
          <LocationInput
            placeholder="Enter destination"
            onLocationSelect={this.handleEndLocationSelect}
          />
        </View>

        {/* Selected Ending Location */}
        {endLocation && (
          <View style={styles.selectedInfoContainer}>
            <Text style={styles.selectedLabel}>
              Selected Destination:
            </Text>
            <Text style={styles.selectedName}>{endLocation.name}</Text>
            <Text style={styles.selectedAddress}>
              {endLocation.address}
            </Text>
            <Text style={styles.validationIndicator}>
              {endLocation.validated ? '✓ Validated' : '⚠ Pending Validation'}
            </Text>
          </View>
        )}

        {/* Ready Status */}
        {startLocation && endLocation && (
          <View style={styles.readyContainer}>
            <Text style={styles.readyText}>
              ✓ Ready to check weather along route
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
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionContainer: {
    marginVertical: 12,
    marginHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  selectedInfoContainer: {
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  selectedLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  selectedAddress: {
    fontSize: 13,
    color: '#558b2f',
    marginBottom: 8,
  },
  validationIndicator: {
    fontSize: 12,
    color: '#689f38',
    fontWeight: '500',
  },
  readyContainer: {
    marginHorizontal: 12,
    marginVertical: 24,
    padding: 16,
    backgroundColor: '#c8e6c9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
    alignItems: 'center',
  },
  readyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b5e20',
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => WeatherAlongRoute);
