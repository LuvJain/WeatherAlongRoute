// @flow

import React, { Component } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Geolocation,
  Alert,
  Platform,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import LocationStorage from '../services/LocationStorage';
import type { Location, RecentLocation } from '../models/Location';

const GOOGLE_PLACES_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA';

type Props = {
  onLocationSelect?: (location: Location) => void,
  placeholder?: string,
};

type State = {
  isLoadingGPS: boolean,
  hasError: boolean,
  errorMessage: string,
  isOnline: boolean,
  selectedLocation: ?Location,
  recentLocations: RecentLocation[],
};

/**
 * LocationInput Component
 * Provides GPS detection, Google Places autocomplete, and recent locations
 * with offline-capable location validation
 */
class LocationInput extends Component<Props, State> {
  autocompleteRef: ?any;

  static defaultProps = {
    placeholder: 'Enter destination',
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      isLoadingGPS: false,
      hasError: false,
      errorMessage: '',
      isOnline: true,
      selectedLocation: null,
      recentLocations: [],
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
      const recentLocations = await LocationStorage.getRecentLocations();
      this.setState({ recentLocations });
    } catch (error) {
      console.warn('Failed to load recent locations:', error);
      // Gracefully handle offline - continue without recent locations
      this.setState({ isOnline: false });
    }
  };

  /**
   * Detect current GPS location
   */
  detectCurrentLocation = () => {
    this.setState({ isLoadingGPS: true, hasError: false });

    const onSuccess = (position: any) => {
      const { latitude, longitude } = position.coords;

      // Create a location object from GPS coordinates
      const currentLocation: Location = {
        id: `gps_${Date.now()}`,
        name: 'Current Location',
        address: `${latitude}, ${longitude}`,
        latitude,
        longitude,
        timestamp: Date.now(),
        validated: false, // GPS coordinates need reverse geocoding for full validation
      };

      this.setState({
        selectedLocation: currentLocation,
        isLoadingGPS: false,
        hasError: false,
      });

      if (this.props.onLocationSelect) {
        this.props.onLocationSelect(currentLocation);
      }
    };

    const onError = (error: any) => {
      let errorMessage = 'Failed to get current location';

      if (error.code === 1) {
        errorMessage = 'Location permission denied';
      } else if (error.code === 2) {
        errorMessage = 'Position unavailable';
      } else if (error.code === 3) {
        errorMessage = 'Location request timeout';
      }

      this.setState({
        isLoadingGPS: false,
        hasError: true,
        errorMessage,
        isOnline: false, // Mark as offline if GPS fails
      });

      console.warn('GPS Error:', errorMessage);
    };

    // Use Geolocation API
    const timeout = Platform.OS === 'ios' ? 5000 : 10000;
    Geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout,
      maximumAge: 0,
    });
  };

  /**
   * Handle location selection from Places autocomplete
   */
  handlePlaceSelected = (data: any, details: ?any) => {
    if (!details) {
      this.setState({
        hasError: true,
        errorMessage: 'Could not retrieve location details',
        isOnline: false,
      });
      return;
    }

    const location: Location = {
      id: `place_${Date.now()}`,
      name: data.description || data.name || 'Unknown Place',
      address: details.formatted_address || data.description,
      latitude: details.geometry?.location?.lat || 0,
      longitude: details.geometry?.location?.lng || 0,
      timestamp: Date.now(),
      validated: true,
    };

    this.setState({
      selectedLocation: location,
      hasError: false,
      errorMessage: '',
    });

    // Save to recent locations asynchronously
    this.saveLocationToRecents(location);

    if (this.props.onLocationSelect) {
      this.props.onLocationSelect(location);
    }
  };

  /**
   * Save location to recent locations
   */
  saveLocationToRecents = async (location: Location) => {
    try {
      await LocationStorage.saveLocation(location);
      // Reload recent locations
      await this.loadRecentLocations();
    } catch (error) {
      console.warn('Failed to save location to recents:', error);
      // Don't block user interaction if saving fails
    }
  };

  /**
   * Handle selection from recent locations list
   */
  handleRecentLocationSelected = (location: RecentLocation) => {
    this.setState({
      selectedLocation: location,
      hasError: false,
      errorMessage: '',
    });

    if (this.props.onLocationSelect) {
      this.props.onLocationSelect(location);
    }
  };

  render() {
    const {
      isLoadingGPS,
      hasError,
      errorMessage,
      selectedLocation,
      recentLocations,
    } = this.state;

    return (
      <View style={styles.container}>
        {/* GPS Detection Button */}
        <View style={styles.gpsButtonContainer}>
          <TouchableOpacity
            style={[
              styles.gpsButton,
              isLoadingGPS && styles.gpsButtonDisabled,
            ]}
            onPress={this.detectCurrentLocation}
            disabled={isLoadingGPS}
          >
            {isLoadingGPS ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={styles.gpsLoader}
              />
            ) : (
              <Text style={styles.gpsButtonText}>📍 Current Location</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Display (Minimal - non-blocking) */}
        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Google Places Autocomplete */}
        <View style={styles.autocompleteContainer}>
          <GooglePlacesAutocomplete
            ref={(ref) => {
              this.autocompleteRef = ref;
            }}
            placeholder={this.props.placeholder}
            minLength={2}
            autoFocus={false}
            fetchDetails={true}
            onPress={this.handlePlaceSelected}
            getDefaultValue={() => {
              return '';
            }}
            query={{
              key: GOOGLE_PLACES_API_KEY,
              language: 'en',
              types: 'address',
            }}
            styles={{
              description: {
                fontWeight: 'bold',
                fontSize: 14,
              },
              predefinedPlacesDescription: {
                color: '#1faadb',
              },
              textInputContainer: {
                backgroundColor: '#fff',
                borderTopWidth: 0,
                borderBottomWidth: 1,
                borderBottomColor: '#ccc',
              },
              textInput: {
                marginLeft: 0,
                marginRight: 0,
                height: 44,
                color: '#5d5d5d',
                fontSize: 14,
              },
            }}
            currentLocation={false}
            nearbyPlacesAPI="GooglePlacesSearch"
            GooglePlacesSearchQuery={{
              rankby: 'distance',
            }}
          />
        </View>

        {/* Selected Location Display */}
        {selectedLocation && (
          <View style={styles.selectedLocationContainer}>
            <Text style={styles.selectedLocationLabel}>Selected:</Text>
            <Text style={styles.selectedLocationName}>
              {selectedLocation.name}
            </Text>
            <Text style={styles.selectedLocationAddress}>
              {selectedLocation.address}
            </Text>
            <Text style={styles.validationStatus}>
              {selectedLocation.validated ? '✓ Validated' : '⚠ Not validated'}
            </Text>
          </View>
        )}

        {/* Recent Locations List */}
        {recentLocations.length > 0 && (
          <View style={styles.recentLocationsContainer}>
            <Text style={styles.recentLocationsTitle}>Recent Locations</Text>
            <ScrollView
              style={styles.recentLocationsList}
              showsVerticalScrollIndicator={false}
            >
              {recentLocations.map((location, index) => (
                <TouchableOpacity
                  key={location.id}
                  style={styles.recentLocationItem}
                  onPress={() => this.handleRecentLocationSelected(location)}
                >
                  <View style={styles.recentLocationContent}>
                    <Text style={styles.recentLocationName}>
                      {location.name}
                    </Text>
                    <Text style={styles.recentLocationAddress}>
                      {location.address}
                    </Text>
                    {location.frequency > 1 && (
                      <Text style={styles.frequencyBadge}>
                        Used {location.frequency} times
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  gpsButtonContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  gpsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gpsButtonDisabled: {
    opacity: 0.6,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gpsLoader: {
    marginRight: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 13,
    fontWeight: '500',
  },
  autocompleteContainer: {
    marginHorizontal: 0,
    marginVertical: 8,
    zIndex: 1,
  },
  selectedLocationContainer: {
    backgroundColor: '#e8f5e9',
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  selectedLocationLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedLocationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 2,
  },
  selectedLocationAddress: {
    fontSize: 13,
    color: '#558b2f',
    marginBottom: 6,
  },
  validationStatus: {
    fontSize: 12,
    color: '#689f38',
    fontWeight: '500',
  },
  recentLocationsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  recentLocationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  recentLocationsList: {
    flex: 1,
  },
  recentLocationItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentLocationContent: {
    flexDirection: 'column',
  },
  recentLocationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  recentLocationAddress: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  frequencyBadge: {
    fontSize: 11,
    color: '#0288d1',
    fontWeight: '500',
  },
});

export default LocationInput;
