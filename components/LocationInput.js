// @flow

import React, { Component } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import type { Location } from '../models/Location';
import { createLocation } from '../models/Location';
import LocationStorage from '../services/LocationStorage';

type Props = {
  onLocationSelect: (location: Location) => void;
  placeholder?: string;
  googleApiKey: string;
};

type State = {
  location: ?Location;
  gpsLoading: boolean;
  gpsError: ?string;
  recentLocations: Array<Location>;
  showRecentLocations: boolean;
  validated: boolean;
  validationError: ?string;
  isOffline: boolean;
};

export class LocationInput extends Component<Props, State> {
  googlePlacesRef: ?any;

  constructor(props: Props) {
    super(props);
    this.state = {
      location: null,
      gpsLoading: false,
      gpsError: null,
      recentLocations: [],
      showRecentLocations: false,
      validated: false,
      validationError: null,
      isOffline: false,
    };
  }

  componentDidMount() {
    this.loadRecentLocations();
  }

  /**
   * Load recent locations from AsyncStorage
   */
  loadRecentLocations = async () => {
    try {
      const recentData = await LocationStorage.getRecentLocations();
      const locations = recentData.map((item) => item.location);
      this.setState({ recentLocations: locations });
    } catch (error) {
      console.warn('Could not load recent locations:', error);
      // Gracefully handle offline scenario
      this.setState({ isOffline: true });
    }
  };

  /**
   * Detect current location using GPS
   */
  detectCurrentLocation = async () => {
    this.setState({ gpsLoading: true, gpsError: null });

    try {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.reverseGeocodeLocation(latitude, longitude);
        },
        (error) => {
          this.setState({
            gpsLoading: false,
            gpsError: 'Could not detect location',
            isOffline: true,
            validated: false,
          });
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
    } catch (error) {
      this.setState({
        gpsLoading: false,
        gpsError: 'Location permission denied',
        isOffline: true,
        validated: false,
      });
    }
  };

  /**
   * Reverse geocode coordinates to address
   */
  reverseGeocodeLocation = (latitude: number, longitude: number) => {
    // Using Google's reverse geocoding API
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.props.googleApiKey}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data.results && data.results.length > 0) {
          const address = data.results[0].formatted_address;
          const placeId = data.results[0].place_id;
          const location = createLocation(
            address,
            latitude,
            longitude,
            placeId,
            true
          );
          this.selectLocation(location, true);
        } else {
          this.setState({
            gpsLoading: false,
            gpsError: 'Could not find address for location',
            validated: false,
          });
        }
      })
      .catch((error) => {
        this.setState({
          gpsLoading: false,
          gpsError: 'Network error during geocoding',
          isOffline: true,
          validated: false,
        });
      });
  };

  /**
   * Handle autocomplete selection with callback
   */
  handleAutocompleteSelect = (data: any, details: any) => {
    if (details && details.geometry) {
      const location = createLocation(
        data.description,
        details.geometry.location.lat,
        details.geometry.location.lng,
        data.place_id,
        true
      );
      this.selectLocation(location, true);
    } else {
      this.setState({
        validationError: 'Could not validate location',
        validated: false,
      });
    }
  };

  /**
   * Select a location (from GPS, autocomplete, or recent locations)
   */
  selectLocation = (location: Location, validated: boolean = false) => {
    this.setState({
      location,
      validated,
      gpsLoading: false,
      gpsError: null,
      validationError: null,
      showRecentLocations: false,
    });

    // Save to recent locations
    LocationStorage.saveLocation(location).catch((error) => {
      console.warn('Could not save location:', error);
    });

    // Callback to parent
    this.props.onLocationSelect(location);
  };

  /**
   * Handle selection from recent locations list
   */
  handleRecentLocationSelect = (location: Location) => {
    this.selectLocation(location, true);
  };

  /**
   * Toggle recent locations visibility
   */
  toggleRecentLocations = () => {
    this.setState((prevState) => ({
      showRecentLocations: !prevState.showRecentLocations,
    }));
  };

  /**
   * Clear current location
   */
  clearLocation = () => {
    this.setState({
      location: null,
      validated: false,
      gpsError: null,
      validationError: null,
    });
  };

  render() {
    const {
      location,
      gpsLoading,
      gpsError,
      recentLocations,
      showRecentLocations,
      validated,
      validationError,
      isOffline,
    } = this.state;
    const { placeholder, googleApiKey } = this.props;

    return (
      <View style={styles.container}>
        {/* GPS Detection Button */}
        <View style={styles.gpsButtonContainer}>
          <TouchableOpacity
            style={[
              styles.gpsButton,
              gpsLoading && styles.gpsButtonDisabled,
            ]}
            onPress={this.detectCurrentLocation}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={styles.gpsButtonText}
              />
            ) : (
              <Text style={styles.gpsButtonText}>📍 Current Location</Text>
            )}
          </TouchableOpacity>

          {/* GPS Error */}
          {gpsError && !validated && (
            <Text style={styles.errorText}>{gpsError}</Text>
          )}
        </View>

        {/* Current Location Display */}
        {location && (
          <View style={styles.selectedLocationContainer}>
            <Text style={styles.selectedLocationLabel}>Selected Location:</Text>
            <Text style={styles.selectedLocationAddress}>{location.address}</Text>
            {validated && (
              <Text style={styles.validatedBadge}>✓ Validated</Text>
            )}
            {isOffline && !validated && (
              <Text style={styles.unvalidatedBadge}>⚠ Offline</Text>
            )}
            <TouchableOpacity onPress={this.clearLocation}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Google Places Autocomplete */}
        <View style={styles.autocompleteContainer}>
          <GooglePlacesAutocomplete
            ref={(instance) => {
              this.googlePlacesRef = instance;
            }}
            placeholder={placeholder || 'Enter destination'}
            minLength={2}
            autoFocus={false}
            fetchDetails={true}
            onPress={this.handleAutocompleteSelect}
            query={{
              key: googleApiKey,
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
            nearbyPlacesAPI="GooglePlacesSearch"
            GooglePlacesSearchQuery={{
              rankby: 'distance',
            }}
          />
        </View>

        {/* Minimal Validation Error */}
        {validationError && !validated && (
          <Text style={styles.minimalError}>{validationError}</Text>
        )}

        {/* Recent Locations Toggle */}
        {recentLocations.length > 0 && (
          <View style={styles.recentLocationsSection}>
            <TouchableOpacity
              style={styles.recentLocationsToggle}
              onPress={this.toggleRecentLocations}
            >
              <Text style={styles.recentLocationsToggleText}>
                {showRecentLocations ? '▼' : '▶'} Recent Locations (
                {recentLocations.length})
              </Text>
            </TouchableOpacity>

            {/* Recent Locations List */}
            {showRecentLocations && (
              <ScrollView style={styles.recentLocationsList}>
                {recentLocations.map((loc, index) => (
                  <TouchableOpacity
                    key={loc.id || index}
                    style={styles.recentLocationItem}
                    onPress={() => this.handleRecentLocationSelect(loc)}
                  >
                    <Text style={styles.recentLocationText}>
                      {loc.address}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Offline Notice */}
        {isOffline && (
          <Text style={styles.offlineNotice}>
            ℹ Offline mode - location submission allowed
          </Text>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  gpsButtonContainer: {
    marginBottom: 12,
  },
  gpsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedLocationContainer: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  selectedLocationLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  selectedLocationAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  validatedBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  unvalidatedBadge: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
    marginBottom: 8,
  },
  clearButton: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },
  autocompleteContainer: {
    marginBottom: 12,
    zIndex: 100,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 8,
  },
  minimalError: {
    fontSize: 12,
    color: '#FF9500',
    marginBottom: 8,
  },
  offlineNotice: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  recentLocationsSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 12,
  },
  recentLocationsToggle: {
    paddingVertical: 8,
  },
  recentLocationsToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  recentLocationsList: {
    marginTop: 8,
    maxHeight: 200,
  },
  recentLocationItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  recentLocationText: {
    fontSize: 13,
    color: '#333333',
  },
});

export default LocationInput;
