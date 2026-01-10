/**
 * Sample React Native App with LocationInput Component
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
import LocationInput from './components/LocationInput';

export default class LandingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      startLocation: null,
      endLocation: null,
      startValidated: false,
      endValidated: false,
    };
  }

  /**
   * Handle starting location selection
   */
  handleStartLocationSelected = (location, validated) => {
    this.setState({
      startLocation: location,
      startValidated: validated,
    });
    console.log('Start location selected:', location);
  };

  /**
   * Handle ending location selection
   */
  handleEndLocationSelected = (location, validated) => {
    this.setState({
      endLocation: location,
      endValidated: validated,
    });
    console.log('End location selected:', location);
  };

  render() {
    const { startLocation, endLocation, startValidated, endValidated } = this.state;

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to Weather Along RizRoute
        </Text>

        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Starting Location</Text>
          <LocationInput
            placeholder="Enter starting location"
            onLocationSelected={this.handleStartLocationSelected}
          />
          {startLocation && (
            <View style={styles.selectedLocation}>
              <Text style={styles.selectedLocationName}>{startLocation.name}</Text>
              <Text style={styles.selectedLocationAddress}>{startLocation.address}</Text>
              {!startValidated && (
                <Text style={styles.validationStatus}>
                  ⚠️ Will validate when online
                </Text>
              )}
              {startValidated && (
                <Text style={styles.validationStatus}>✓ Validated</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Final Destination</Text>
          <LocationInput
            placeholder="Enter final destination"
            onLocationSelected={this.handleEndLocationSelected}
          />
          {endLocation && (
            <View style={styles.selectedLocation}>
              <Text style={styles.selectedLocationName}>{endLocation.name}</Text>
              <Text style={styles.selectedLocationAddress}>{endLocation.address}</Text>
              {!endValidated && (
                <Text style={styles.validationStatus}>
                  ⚠️ Will validate when online
                </Text>
              )}
              {endValidated && (
                <Text style={styles.validationStatus}>✓ Validated</Text>
              )}
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
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333333',
  },
  locationSection: {
    marginVertical: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333333',
  },
  selectedLocation: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    borderRadius: 4,
  },
  selectedLocationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 5,
  },
  selectedLocationAddress: {
    fontSize: 12,
    color: '#558B2F',
    marginBottom: 5,
  },
  validationStatus: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#558B2F',
    marginTop: 5,
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => LandingPage);
