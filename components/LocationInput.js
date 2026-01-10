// @flow

import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  NetInfo,
  Dimensions
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { LocationStorageService } from '../services/LocationStorage';
import type { Location, RecentLocation } from '../models/Location';

const GOOGLE_PLACES_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA';

type Props = {
  placeholder?: string,
  onLocationSelect?: (location: Location) => void,
  onValidationChange?: (validated: boolean) => void,
  allowOfflineSubmission?: boolean
};

type State = {
  loading: boolean,
  validated: boolean,
  recentLocations: Array<RecentLocation>,
  isOnline: boolean,
  selectedLocation: ?Location,
  validationError: ?string
};

/**
 * LocationInput Component
 * Provides GPS detection, Places autocomplete, recent locations, and offline support
 */
export class LocationInput extends Component<Props, State> {
  autocompleteRef: any;

  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      validated: false,
      recentLocations: [],
      isOnline: true,
      selectedLocation: null,
      validationError: null
    };
  }

  componentDidMount() {
    this._loadRecentLocations();
    this._checkNetworkStatus();
    this._setupNetworkListener();
  }

  componentWillUnmount() {
    if (NetInfo.isConnected) {
      NetInfo.isConnected.removeEventListener('change', this._handleNetworkChange);
    }
  }

  _checkNetworkStatus = async () => {
    try {
      const isConnected = await NetInfo.isConnected.fetch();
      this.setState({ isOnline: isConnected });
    } catch (error) {
      // Default to offline if check fails
      this.setState({ isOnline: false });
    }
  };

  _setupNetworkListener = () => {
    if (NetInfo.isConnected) {
      NetInfo.isConnected.addEventListener('change', this._handleNetworkChange);
    }
  };

  _handleNetworkChange = (isConnected: boolean) => {
    this.setState({ isOnline: isConnected });
  };

  _loadRecentLocations = async () => {
    try {
      const recentLocations = await LocationStorageService.getRecentLocations();
      this.setState({ recentLocations });
    } catch (error) {
      console.error('Error loading recent locations:', error);
      this.setState({ recentLocations: [] });
    }
  };

  _getCurrentLocation = async () => {
    this.setState({ loading: true, validationError: null });

    try {
      // Check if Geolocation API is available
      if (!navigator.geolocation) {
        this._handleLocationError('Geolocation is not available');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this._handleLocationSuccess(position);
        },
        (error) => {
          this._handleLocationError(error.message);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (error) {
      this._handleLocationError(error.message);
    }
  };

  _handleLocationSuccess = async (position: any) => {
    try {
      const { latitude, longitude } = position.coords;
      const location: Location = {
        id: `loc_${Date.now()}`,
        latitude,
        longitude,
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        validated: true,
        timestamp: Date.now()
      };

      this.setState({
        selectedLocation: location,
        validated: true,
        loading: false,
        validationError: null
      });

      if (this.props.onLocationSelect) {
        this.props.onLocationSelect(location);
      }

      if (this.props.onValidationChange) {
        this.props.onValidationChange(true);
      }

      // Save to recent locations
      try {
        await LocationStorageService.saveLocation(location);
        await this._loadRecentLocations();
      } catch (error) {
        console.error('Error saving location:', error);
      }
    } catch (error) {
      this._handleLocationError(error.message);
    }
  };

  _handleLocationError = (errorMessage: string) => {
    this.setState({
      loading: false,
      validated: false,
      validationError: errorMessage
    });
    if (this.props.onValidationChange) {
      this.props.onValidationChange(false);
    }
  };

  _handlePlacesSelection = async (data: any, details: any) => {
    try {
      if (!details || !details.geometry) {
        this._handleLocationError('Invalid location details');
        return;
      }

      const { lat, lng } = details.geometry.location;
      const location: Location = {
        id: `loc_${Date.now()}`,
        latitude: lat,
        longitude: lng,
        address: data.description || '',
        name: data.structured_formatting?.main_text || '',
        placeId: data.place_id,
        validated: true,
        timestamp: Date.now()
      };

      this.setState({
        selectedLocation: location,
        validated: true,
        validationError: null
      });

      if (this.props.onLocationSelect) {
        this.props.onLocationSelect(location);
      }

      if (this.props.onValidationChange) {
        this.props.onValidationChange(true);
      }

      // Save to recent locations
      try {
        await LocationStorageService.saveLocation(location);
        await this._loadRecentLocations();
      } catch (error) {
        console.error('Error saving location:', error);
      }
    } catch (error) {
      this._handleLocationError(error.message);
    }
  };

  _selectRecentLocation = async (recentLocation: RecentLocation) => {
    try {
      const location = recentLocation.location;
      this.setState({
        selectedLocation: location,
        validated: true,
        validationError: null
      });

      if (this.props.onLocationSelect) {
        this.props.onLocationSelect(location);
      }

      if (this.props.onValidationChange) {
        this.props.onValidationChange(true);
      }

      // Update frequency
      try {
        await LocationStorageService.saveLocation(location);
        await this._loadRecentLocations();
      } catch (error) {
        console.error('Error updating location frequency:', error);
      }
    } catch (error) {
      console.error('Error selecting recent location:', error);
    }
  };

  _handleOfflineSubmission = () => {
    this.setState({ validated: false });
    if (this.props.onValidationChange) {
      this.props.onValidationChange(false);
    }
    Alert.alert(
      'Offline Mode',
      'Location validation is not available offline. Location data can still be submitted.',
      [{ text: 'OK' }]
    );
  };

  render() {
    const {
      loading,
      validated,
      recentLocations,
      isOnline,
      selectedLocation,
      validationError
    } = this.state;
    const { placeholder = 'Search location...', allowOfflineSubmission = true } = this.props;

    return (
      <View style={styles.container}>
        {/* GPS Detection Button */}
        <TouchableOpacity
          style={[styles.gpsButton, loading && styles.gpsButtonDisabled]}
          onPress={this._getCurrentLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.gpsButtonText}>📍 Current Location</Text>
          )}
        </TouchableOpacity>

        {/* Places Autocomplete */}
        <GooglePlacesAutocomplete
          ref={(ref) => {
            this.autocompleteRef = ref;
          }}
          placeholder={placeholder}
          minLength={2}
          autoFocus={false}
          fetchDetails={true}
          onPress={this._handlePlacesSelection}
          getDefaultValue={() => selectedLocation?.address || ''}
          query={{
            key: GOOGLE_PLACES_API_KEY,
            language: 'en',
            types: 'address'
          }}
          styles={{
            container: styles.autocompleteContainer,
            textInputContainer: styles.autocompleteInput,
            textInput: styles.autocompleteTextInput,
            predefinedPlacesDescription: styles.predefinedPlacesDescription,
            description: styles.description,
            row: styles.row
          }}
          currentLocation={true}
          currentLocationLabel="Current location"
          nearbyPlacesAPI="GooglePlacesSearch"
          GooglePlacesSearchQuery={{
            rankby: 'distance'
          }}
        />

        {/* Validation Status */}
        {!isOnline && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>
              ⚠️ Offline Mode: Location validation disabled
            </Text>
            {allowOfflineSubmission && (
              <TouchableOpacity
                style={styles.offlineSubmitButton}
                onPress={this._handleOfflineSubmission}
              >
                <Text style={styles.offlineSubmitButtonText}>Submit Anyway</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Validation Error */}
        {validationError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {validationError}</Text>
          </View>
        )}

        {/* Validation Status Indicator */}
        {validated && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>✓ Location validated</Text>
          </View>
        )}

        {/* Recent Locations Section */}
        {recentLocations.length > 0 && (
          <View style={styles.recentLocationsContainer}>
            <Text style={styles.recentLocationsTitle}>Recent Locations</Text>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.recentLocationsList}
            >
              {recentLocations.map((recentLocation, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentLocationItem}
                  onPress={() => this._selectRecentLocation(recentLocation)}
                >
                  <Text style={styles.recentLocationName}>
                    {recentLocation.location.name ||
                      recentLocation.location.address.split(',')[0]}
                  </Text>
                  <Text style={styles.recentLocationFrequency}>
                    Used {recentLocation.frequency} times
                  </Text>
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
    padding: 16,
    backgroundColor: '#F5F5F5'
  },
  gpsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gpsButtonDisabled: {
    opacity: 0.6
  },
  gpsButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  },
  autocompleteContainer: {
    flex: 0,
    marginBottom: 12
  },
  autocompleteInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    overflow: 'hidden'
  },
  autocompleteTextInput: {
    fontSize: 14,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 12
  },
  predefinedPlacesDescription: {
    color: '#1faadb'
  },
  description: {
    fontWeight: '500'
  },
  row: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  offlineWarning: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107'
  },
  offlineWarningText: {
    color: '#856404',
    fontSize: 12,
    marginBottom: 8
  },
  offlineSubmitButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  offlineSubmitButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600'
  },
  errorContainer: {
    backgroundColor: '#F8D7DA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545'
  },
  errorText: {
    color: '#721C24',
    fontSize: 12
  },
  successContainer: {
    backgroundColor: '#D4EDDA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28A745'
  },
  successText: {
    color: '#155724',
    fontSize: 12,
    fontWeight: '500'
  },
  recentLocationsContainer: {
    marginTop: 12
  },
  recentLocationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  recentLocationsList: {
    marginHorizontal: -16,
    paddingHorizontal: 16
  },
  recentLocationItem: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    minWidth: 140
  },
  recentLocationName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  recentLocationFrequency: {
    fontSize: 10,
    color: '#999'
  }
});

export default LocationInput;
