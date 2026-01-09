/**
 * @flow
 * LocationInput component with GPS detection, Places autocomplete, and offline support
 */

import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Geolocation } from 'react-native';
import type { Location, RecentLocation } from '../models/Location';
import {
  createLocation,
  createRecentLocation,
  isValidLocation,
} from '../models/Location';
import {
  getRecentLocations,
  addRecentLocation,
} from '../services/LocationStorage';

type Props = {
  placeholder?: string,
  onLocationSelect: (location: Location) => void,
  onError?: (error: string) => void,
  googlePlacesApiKey: string,
  testID?: string,
};

type State = {
  location: ?Location,
  recentLocations: Array<RecentLocation>,
  loading: boolean,
  gpsLoading: boolean,
  error: ?string,
  isOnline: boolean,
};

class LocationInput extends Component<Props, State> {
  autocompleteRef: ?GooglePlacesAutocomplete;

  constructor(props: Props) {
    super(props);
    this.state = {
      location: null,
      recentLocations: [],
      loading: false,
      gpsLoading: false,
      error: null,
      isOnline: true,
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
      this.setState({ loading: true });
      const locations = await getRecentLocations();
      this.setState({ recentLocations: locations, loading: false });
    } catch (error) {
      console.warn('Failed to load recent locations:', error);
      this.setState({ loading: false });
    }
  };

  /**
   * Handle GPS detection button press
   */
  handleGPSDetection = async () => {
    this.setState({ gpsLoading: true, error: null });

    try {
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Create location from GPS coordinates
          const location = createLocation(
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            `gps_${latitude}_${longitude}`,
            latitude,
            longitude,
            true, // GPS locations are validated
            'Current Location (GPS)'
          );

          this.setState({ location, gpsLoading: false, error: null });
          this.props.onLocationSelect(location);

          // Add to recent locations
          const recentLoc = createRecentLocation(
            location.place,
            location.placeId,
            latitude,
            longitude
          );
          await addRecentLocation(recentLoc);
          await this.loadRecentLocations();
        },
        (error) => {
          const errorMsg =
            error.code === 1
              ? 'Location permission denied. Please enable location services.'
              : 'Failed to get current location. Please try again.';

          this.setState({
            error: errorMsg,
            gpsLoading: false,
            // Allow submission even with GPS error (offline-capable)
            location: createLocation(
              'Current Location',
              `gps_failed_${Date.now()}`,
              0,
              0,
              false, // Mark as not validated since GPS failed
              'Failed to retrieve GPS coordinates'
            ),
          });

          if (this.props.onError) {
            this.props.onError(errorMsg);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (error) {
      const errorMsg = 'GPS detection failed';
      this.setState({
        error: errorMsg,
        gpsLoading: false,
      });
      if (this.props.onError) {
        this.props.onError(errorMsg);
      }
    }
  };

  /**
   * Handle place selection from autocomplete
   */
  handlePlaceSelect = async (data: any, details: ?any) => {
    if (!details) {
      this.setState({ error: 'Could not get location details' });
      return;
    }

    try {
      const { lat, lng } = details.geometry.location;
      const location = createLocation(
        data.description,
        data.place_id,
        lat,
        lng,
        true, // Autocomplete selections are validated
        data.description
      );

      this.setState({ location, error: null });
      this.props.onLocationSelect(location);

      // Add to recent locations
      const recentLoc = createRecentLocation(
        location.place,
        location.placeId,
        lat,
        lng
      );
      await addRecentLocation(recentLoc);
      await this.loadRecentLocations();
    } catch (error) {
      const errorMsg = 'Failed to process location selection';
      this.setState({ error: errorMsg });
      if (this.props.onError) {
        this.props.onError(errorMsg);
      }
    }
  };

  /**
   * Handle recent location selection
   */
  handleRecentLocationSelect = (recentLocation: RecentLocation) => {
    const location = createLocation(
      recentLocation.place,
      recentLocation.placeId,
      recentLocation.latitude,
      recentLocation.longitude,
      true // Recent locations from storage are validated
    );

    this.setState({ location, error: null });
    this.props.onLocationSelect(location);
  };

  render() {
    const {
      location,
      recentLocations,
      gpsLoading,
      error,
      loading,
    } = this.state;
    const { placeholder = 'Enter location', googlePlacesApiKey, testID } =
      this.props;

    return (
      <View style={styles.container} testID={testID}>
        {/* GPS Detection Button */}
        <TouchableOpacity
          style={[styles.gpsButton, gpsLoading && styles.gpsButtonDisabled]}
          onPress={this.handleGPSDetection}
          disabled={gpsLoading}
          testID={`${testID}_gps_button`}
        >
          {gpsLoading ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFF"
                testID={`${testID}_gps_loading`}
              />
              <Text style={styles.gpsButtonText}>Detecting...</Text>
            </>
          ) : (
            <Text style={styles.gpsButtonText}>📍 Use Current Location</Text>
          )}
        </TouchableOpacity>

        {/* Current Location Display */}
        {location && (
          <View style={styles.locationDisplay} testID={`${testID}_display`}>
            <Text style={styles.locationText}>{location.place}</Text>
            {!location.validated && (
              <Text style={styles.unvalidatedText}>
                ⚠️ Offline - Location not validated
              </Text>
            )}
          </View>
        )}

        {/* Error Display (minimal, non-blocking) */}
        {error && (
          <Text
            style={styles.errorText}
            testID={`${testID}_error`}
          >
            ℹ️ {error}
          </Text>
        )}

        {/* GooglePlacesAutocomplete */}
        <GooglePlacesAutocomplete
          ref={(ref) => {
            this.autocompleteRef = ref;
          }}
          placeholder={placeholder}
          minLength={2}
          autoFocus={false}
          fetchDetails={true}
          onPress={this.handlePlaceSelect}
          getDefaultValue={() => location?.place || ''}
          query={{
            key: googlePlacesApiKey,
            language: 'en',
            types: 'address',
            components: 'country:us',
          }}
          styles={{
            container: styles.autocompleteContainer,
            textInputContainer: styles.textInputContainer,
            textInput: styles.textInput,
            listView: styles.listView,
            row: styles.row,
            description: styles.description,
            predefinedPlacesDescription: styles.predefinedPlacesDescription,
          }}
          currentLocation={false}
          nearbyPlacesAPI="GooglePlacesSearch"
          debounce={400}
          testID={`${testID}_autocomplete`}
        />

        {/* Recent Locations List */}
        {recentLocations.length > 0 && (
          <View style={styles.recentLocationsContainer}>
            <Text style={styles.recentLocationsTitle}>Recent Locations</Text>
            <ScrollView
              horizontal={true}
              style={styles.recentLocationsList}
              testID={`${testID}_recent_list`}
            >
              {recentLocations.map((recentLoc) => (
                <TouchableOpacity
                  key={recentLoc.id}
                  style={styles.recentLocationChip}
                  onPress={() => this.handleRecentLocationSelect(recentLoc)}
                  testID={`${testID}_recent_${recentLoc.placeId}`}
                >
                  <Text
                    style={styles.recentLocationText}
                    numberOfLines={2}
                  >
                    {recentLoc.place}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Loading State for Recent Locations */}
        {loading && (
          <ActivityIndicator
            size="small"
            color="#007AFF"
            style={styles.loadingIndicator}
            testID={`${testID}_loading`}
          />
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  gpsButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gpsButtonDisabled: {
    opacity: 0.6,
  },
  gpsButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationDisplay: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  unvalidatedText: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  autocompleteContainer: {
    flex: 1,
    marginBottom: 12,
  },
  textInputContainer: {
    backgroundColor: '#FFF',
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  textInput: {
    backgroundColor: '#FFF',
    color: '#333',
    height: 44,
    borderRadius: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  listView: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    zIndex: 1000,
    maxHeight: 300,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 44,
    justifyContent: 'center',
  },
  description: {
    fontWeight: '500',
    color: '#333',
  },
  predefinedPlacesDescription: {
    color: '#007AFF',
  },
  recentLocationsContainer: {
    marginTop: 12,
  },
  recentLocationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  recentLocationsList: {
    flexGrow: 0,
  },
  recentLocationChip: {
    backgroundColor: '#E8E8E8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    maxWidth: 140,
  },
  recentLocationText: {
    fontSize: 13,
    color: '#333',
  },
  loadingIndicator: {
    marginVertical: 12,
  },
});

export default LocationInput;
