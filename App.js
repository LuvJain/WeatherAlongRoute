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
import { LocationInput } from './components/LocationInput';
import type { Location } from './models/Location';

/**
 * LandingPage Component
 * Main application component with LocationInput for start and end locations
 */
export default class LandingPage extends Component {
  startLocationRef: any;
  endLocationRef: any;

  constructor(props: any) {
    super(props);
    this.state = {
      startLocation: null,
      endLocation: null,
      startLocationValidated: false,
      endLocationValidated: false
    };
  }

  _handleStartLocationSelect = (location: Location) => {
    this.setState({
      startLocation: location
    });
    console.log('Start location selected:', location);
  };

  _handleEndLocationSelect = (location: Location) => {
    this.setState({
      endLocation: location
    });
    console.log('End location selected:', location);
  };

  _handleStartLocationValidation = (validated: boolean) => {
    this.setState({
      startLocationValidated: validated
    });
  };

  _handleEndLocationValidation = (validated: boolean) => {
    this.setState({
      endLocationValidated: validated
    });
  };

  _handleSubmit = () => {
    const { startLocation, endLocation } = this.state;

    if (startLocation && endLocation) {
      console.log('Route submitted:', {
        startLocation,
        endLocation
      });
      // Handle route submission here
    } else {
      console.warn('Both locations must be selected');
    }
  };

  render() {
    const { startLocationValidated, endLocationValidated } = this.state;

    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollContainer}>
          <Text style={styles.welcome}>
            Welcome to Weather Along RizRoute
          </Text>

          <Text style={styles.sectionTitle}>Starting Location</Text>
          <LocationInput
            ref={(ref) => {
              this.startLocationRef = ref;
            }}
            placeholder="Enter starting location..."
            onLocationSelect={this._handleStartLocationSelect}
            onValidationChange={this._handleStartLocationValidation}
            allowOfflineSubmission={true}
          />

          <Text style={styles.sectionTitle}>Final Destination</Text>
          <LocationInput
            ref={(ref) => {
              this.endLocationRef = ref;
            }}
            placeholder="Enter final destination..."
            onLocationSelect={this._handleEndLocationSelect}
            onValidationChange={this._handleEndLocationValidation}
            allowOfflineSubmission={true}
          />

          {startLocationValidated && endLocationValidated && (
            <View style={styles.submitPrompt}>
              <Text style={styles.submitPromptText}>
                ✓ Both locations are ready. Submit to start your journey!
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  scrollContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  submitPrompt: {
    backgroundColor: '#D4EDDA',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  submitPromptText: {
    color: '#155724',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => LandingPage);
