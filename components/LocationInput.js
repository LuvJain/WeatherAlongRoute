/**
 * @flow
 * LocationInput component with GPS detection, autocomplete, and offline support
 */

import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Geolocation,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { createLocation } from '../models/Location';
import { saveRecentLocation, getRecentLocations } from '../services/LocationStorageService';
import { validateLocationWithConnectivity } from '../services/LocationValidationService';

const GOOGLE_MAPS_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA';

type Props = {
  placeholder: string,
  onLocationSelected: (location: object, validated: boolean) => void,
};

type State = {
  location: ?object,
  loading: boolean,
  recentLocations: Array<object>,
  validationErrors: Array<string>,
  validated: boolean,
  isOffline: boolean,
};

class LocationInput extends Component<Props, State> {
  autocompleteRef = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      location: null,
      loading: false,
      recentLocations: [],
      validationErrors: [],
      validated: false,
      isOffline: false,
    };
  }

  componentDidMount() {
    this.loadRecentLocations();
  }

  /**
   * Load recent locations from storage
   */
  loadRecentLocations = async () => {
    try {
      const recent = await getRecentLocations();
      this.setState({ recentLocations: recent });
    } catch (error) {
      console.error('Error loading recent locations:', error);
    }
  };

  /**
   * Get current location using GPS
   */
  getCurrentLocation = async () => {
    this.setState({ loading: true });

    try {
      const position = await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 1000 }
        );
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const location = createLocation(
        `Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
        `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        latitude,
        longitude,
        `gps_${latitude}_${longitude}`,
        false
      );

      await this.handleLocationSelection(location);
    } catch (error) {
      console.error('Error getting current location:', error);
      this.setState({
        loading: false,
        validationErrors: ['Unable to get current location. Please try again or select manually.'],
      });
    }
  };

  /**
   * Handle location selection from autocomplete
   */
  handleLocationSelection = async (location) => {
    try {
      // Validate location
      const validation = await validateLocationWithConnectivity(location);

      const updatedLocation = {
        ...location,
        validated: validation.validated,
      };

      // Save to recent locations
      await saveRecentLocation(updatedLocation);

      // Reload recent locations
      await this.loadRecentLocations();

      // Update state
      this.setState({
        location: updatedLocation,
        loading: false,
        validated: validation.validated,
        isOffline: validation.isOffline,
        validationErrors: validation.errors,
      });

      // Call parent callback
      this.props.onLocationSelected(updatedLocation, validation.validated);
    } catch (error) {
      console.error('Error handling location selection:', error);
      this.setState({
        loading: false,
        validationErrors: ['Error processing location'],
      });
    }
  };

  /**
   * Handle selection from autocomplete
   */
  onAutocompletePress = (data, details = null) => {
    if (!details) {
      return;
    }

    const location = createLocation(
      data.description,
      details.formatted_address,
      details.geometry.location.lat,
      details.geometry.location.lng,
      data.place_id,
      false
    );

    this.handleLocationSelection(location);
  };

  /**
   * Handle selection from recent locations
   */
  selectRecentLocation = (recentLocation) => {
    const location = createLocation(
      recentLocation.name,
      recentLocation.address,
      recentLocation.latitude,
      recentLocation.longitude,
      recentLocation.placeId,
      true
    );

    this.handleLocationSelection(location);
  };

  /**
   * Render recent locations list
   */
  renderRecentLocations = () => {
    const { recentLocations } = this.state;

    if (recentLocations.length === 0) {
      return null;
    }

    return (
      <View style={styles.recentContainer}>
        <Text style={styles.recentTitle}>Recent Locations</Text>
        {recentLocations.map((loc, index) => (
          <TouchableOpacity
            key={index}
            style={styles.recentItem}
            onPress={() => this.selectRecentLocation(loc)}
          >
            <Text style={styles.recentItemName}>{loc.name}</Text>
            <Text style={styles.recentItemAddress}>{loc.address}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  /**
   * Render validation errors
   */
  renderValidationErrors = () => {
    const { validationErrors, isOffline } = this.state;

    if (validationErrors.length === 0) {
      return null;
    }

    return (
      <View style={styles.errorContainer}>
        {isOffline && (
          <Text style={styles.offlineMessage}>
            You are offline. Location will be validated when connection is restored.
          </Text>
        )}
        {validationErrors.map((error, index) => (
          <Text key={index} style={styles.errorText}>
            • {error}
          </Text>
        ))}
      </View>
    );
  };

  render() {
    const { loading, location } = this.state;

    return (
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <GooglePlacesAutocomplete
            ref={(instance) => {
              this.autocompleteRef = instance;
            }}
            placeholder={this.props.placeholder}
            minLength={2}
            autoFocus={false}
            fetchDetails={true}
            onPress={this.onAutocompletePress}
            getDefaultValue={() => (location ? location.name : '')}
            query={{
              key: GOOGLE_MAPS_API_KEY,
              language: 'en',
              types: 'address',
            }}
            styles={{
              description: {
                fontWeight: 'bold',
              },
              predefinedPlacesDescription: {
                color: '#1faadb',
              },
            }}
            currentLocation={false}
            GoogleReverseGeocodingQuery={{}}
            GooglePlacesSearchQuery={{
              rankby: 'distance',
            }}
          />
        </View>

        <TouchableOpacity
          style={styles.gpsButton}
          onPress={this.getCurrentLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.gpsButtonText}>📍 Current Location</Text>
          )}
        </TouchableOpacity>

        {this.renderValidationErrors()}

        {this.renderRecentLocations()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  inputContainer: {
    marginBottom: 10,
  },
  gpsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  gpsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  recentContainer: {
    marginTop: 15,
    paddingVertical: 10,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
  },
  recentItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  recentItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  recentItemAddress: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  errorContainer: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
    borderRadius: 3,
  },
  errorText: {
    fontSize: 12,
    color: '#856404',
    marginVertical: 2,
  },
  offlineMessage: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
    marginBottom: 5,
    fontStyle: 'italic',
  },
});

export default LocationInput;
