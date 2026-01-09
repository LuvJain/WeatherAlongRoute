// @flow
import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import LocationStorage from '../services/LocationStorage';
import type { Location, RecentLocation } from '../models/types';

type Props = {
  onLocationSelected: (location: Location) => void,
  placeholder?: string,
  googlePlacesApiKey: string
};

type State = {
  gpsLoading: boolean,
  recentLocations: RecentLocation[],
  selectedLocation: ?Location,
  isOnline: boolean,
  validationError: ?string
};

/**
 * LocationInput component
 * Provides GPS detection, Google Places autocomplete, and recent locations
 * Handles offline scenarios gracefully with validated: false
 */
class LocationInput extends Component<Props, State> {
  static defaultProps = {
    placeholder: 'Enter location'
  };

  autocompleteRef = React.createRef();

  constructor(props: Props) {
    super(props);
    this.state = {
      gpsLoading: false,
      recentLocations: [],
      selectedLocation: null,
      isOnline: true,
      validationError: null
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
      const locations = await LocationStorage.getRecentLocations();
      this.setState({ recentLocations: locations });
    } catch (error) {
      console.error('Error loading recent locations:', error);
      this.setState({ recentLocations: [] });
    }
  };

  /**
   * Get current GPS location
   * Sets validated: false if offline
   */
  handleGetCurrentLocation = async () => {
    this.setState({ gpsLoading: true, validationError: null });

    try {
      // Check online status by attempting a simple network request
      const isOnline = await this.checkOnlineStatus();
      this.setState({ isOnline });

      // Get geolocation - works offline but won't have fresh data
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            // Create location object
            const location: Location = {
              id: `gps_${Date.now()}`,
              latitude,
              longitude,
              name: 'Current Location',
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              validated: isOnline // Only validated if online
            };

            this.setState({
              selectedLocation: location,
              gpsLoading: false,
              validationError: null
            });

            // Save to recent locations
            await LocationStorage.saveLocation(location);
            this.loadRecentLocations();

            // Callback to parent
            this.props.onLocationSelected(location);
          },
          (error) => {
            console.error('Geolocation error:', error);
            this.setState({
              gpsLoading: false,
              validationError: 'Unable to get current location',
              isOnline: false
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        this.setState({
          gpsLoading: false,
          validationError: 'Geolocation not available',
          isOnline: false
        });
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      this.setState({
        gpsLoading: false,
        validationError: 'Location service error',
        isOnline: false
      });
    }
  };

  /**
   * Check if device is online
   */
  checkOnlineStatus = async (): Promise<boolean> => {
    try {
      // Try to reach Google Maps API
      const response = await fetch(
        'https://www.google.com/maps/api/js?key=' + this.props.googlePlacesApiKey,
        { method: 'HEAD', timeout: 5000 }
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  /**
   * Handle selection from Google Places autocomplete
   */
  handlePlacesSelected = async (data: any, details: ?any) => {
    try {
      const location: Location = {
        id: `place_${data.place_id || Date.now()}`,
        latitude: details?.geometry?.location?.lat || 0,
        longitude: details?.geometry?.location?.lng || 0,
        name: data.main_text || data.description || '',
        address: data.description || '',
        validated: this.state.isOnline
      };

      this.setState({
        selectedLocation: location,
        validationError: null
      });

      // Save to recent locations
      await LocationStorage.saveLocation(location);
      this.loadRecentLocations();

      // Callback to parent
      this.props.onLocationSelected(location);
    } catch (error) {
      console.error('Error handling places selection:', error);
      this.setState({
        validationError: 'Error selecting location'
      });
    }
  };

  /**
   * Handle selection from recent locations
   */
  handleRecentLocationSelected = async (location: RecentLocation) => {
    this.setState({
      selectedLocation: location,
      validationError: null
    });

    // Update last used
    await LocationStorage.saveLocation(location);
    this.loadRecentLocations();

    // Callback to parent
    this.props.onLocationSelected(location);
  };

  /**
   * Render GPS detection button with loading state
   */
  renderGPSButton() {
    const { gpsLoading } = this.state;

    return (
      <TouchableOpacity
        style={[styles.gpsButton, gpsLoading && styles.gpsButtonDisabled]}
        onPress={this.handleGetCurrentLocation}
        disabled={gpsLoading}
      >
        {gpsLoading ? (
          <View style={styles.gpsLoadingContainer}>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.gpsButtonText}>Getting location...</Text>
          </View>
        ) : (
          <Text style={styles.gpsButtonText}>📍 Current Location</Text>
        )}
      </TouchableOpacity>
    );
  }

  /**
   * Render recent locations list
   */
  renderRecentLocations() {
    const { recentLocations } = this.state;

    if (recentLocations.length === 0) {
      return null;
    }

    return (
      <View style={styles.recentContainer}>
        <Text style={styles.recentTitle}>Recent Locations</Text>
        <FlatList
          data={recentLocations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.recentItem}
              onPress={() => this.handleRecentLocationSelected(item)}
            >
              <View style={styles.recentItemContent}>
                <Text style={styles.recentItemName}>{item.name}</Text>
                <Text style={styles.recentItemAddress} numberOfLines={1}>
                  {item.address}
                </Text>
                <Text style={styles.recentItemFrequency}>
                  Used {item.frequency} time{item.frequency !== 1 ? 's' : ''}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          scrollEnabled={false}
        />
      </View>
    );
  }

  /**
   * Render validation error (minimal, non-blocking)
   */
  renderValidationError() {
    const { validationError, isOnline } = this.state;

    if (!validationError && isOnline) {
      return null;
    }

    return (
      <View style={styles.errorContainer}>
        {validationError && (
          <Text style={styles.errorText}>{validationError}</Text>
        )}
        {!isOnline && (
          <Text style={styles.offlineText}>
            ⚠️ Offline - Location validation disabled
          </Text>
        )}
      </View>
    );
  }

  render() {
    const { placeholder, googlePlacesApiKey } = this.props;

    return (
      <View style={styles.container}>
        {this.renderGPSButton()}

        <GooglePlacesAutocomplete
          ref={this.autocompleteRef}
          placeholder={placeholder}
          minLength={2}
          autoFocus={false}
          fetchDetails={true}
          onPress={this.handlePlacesSelected}
          query={{
            key: googlePlacesApiKey,
            language: 'en',
            types: 'address'
          }}
          styles={{
            container: styles.autocompleteContainer,
            textInput: styles.autocompleteInput,
            description: styles.autocompleteDescription,
            predefinedPlacesDescription: styles.autocompletePredefinedDescription
          }}
          currentLocation={true}
          currentLocationLabel="Current location"
          nearbyPlacesAPI="GooglePlacesSearch"
          GoogleReverseGeocodingQuery={{}}
          GooglePlacesSearchQuery={{
            rankby: 'distance'
          }}
          testID="places-autocomplete"
        />

        {this.renderValidationError()}
        {this.renderRecentLocations()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5'
  },
  gpsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gpsButtonDisabled: {
    backgroundColor: '#ccc'
  },
  gpsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  gpsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  autocompleteContainer: {
    flex: 0,
    marginBottom: 12
  },
  autocompleteInput: {
    borderRadius: 4,
    borderColor: '#ddd',
    borderWidth: 1,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  autocompleteDescription: {
    fontWeight: '400'
  },
  autocompletePredefinedDescription: {
    color: '#1faadb'
  },
  errorContainer: {
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107'
  },
  errorText: {
    color: '#856404',
    fontSize: 13,
    marginVertical: 4
  },
  offlineText: {
    color: '#856404',
    fontSize: 13,
    fontStyle: 'italic'
  },
  recentContainer: {
    marginTop: 12,
    paddingHorizontal: 0
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  recentItem: {
    backgroundColor: 'white',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF'
  },
  recentItemContent: {
    flex: 1
  },
  recentItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  recentItemAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  recentItemFrequency: {
    fontSize: 11,
    color: '#999'
  }
});

export default LocationInput;
