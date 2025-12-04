/**
 * RouteInput.js
 * Component for selecting route origin and destination with autocomplete
 */
import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Geolocation from '@react-native-community/geolocation';
import Permissions from 'react-native-permissions';

class RouteInput extends Component {
  constructor(props) {
    super(props);

    this.state = {
      origin: null,
      destination: null,
      locationPermission: false,
      userLocation: null,
      error: null,
      loading: false,
    };

    // References to the autocomplete components
    this.originRef = null;
    this.destinationRef = null;
  }

  componentDidMount() {
    this.requestLocationPermission();
  }

  // Request location permission
  requestLocationPermission = async () => {
    try {
      this.setState({ loading: true });

      if (Platform.OS === 'ios') {
        const response = await Permissions.request('location');
        if (response === 'authorized') {
          this.setState({ locationPermission: true });
          this.getCurrentLocation();
        }
      } else {
        // For Android
        const granted = await Permissions.request('android.permission.ACCESS_FINE_LOCATION');
        if (granted === 'authorized') {
          this.setState({ locationPermission: true });
          this.getCurrentLocation();
        }
      }
    } catch (err) {
      console.warn(err);
      this.setState({
        error: 'Failed to get location permission',
        loading: false
      });
    }
  };

  // Get user's current location
  getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        this.setState({
          userLocation,
          loading: false
        });
      },
      (error) => this.setState({
        error: error.message,
        loading: false
      }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  // Set origin location selected from autocomplete
  handleOriginSelect = (data, details = null) => {
    if (details && details.geometry) {
      this.setState({ origin: details }, () => {
        // If both origin and destination are set, calculate route
        if (this.state.origin && this.state.destination) {
          this.handleRouteSubmit();
        }
      });
    }
  };

  // Set destination location selected from autocomplete
  handleDestinationSelect = (data, details = null) => {
    if (details && details.geometry) {
      this.setState({ destination: details }, () => {
        // If both origin and destination are set, calculate route
        if (this.state.origin && this.state.destination) {
          this.handleRouteSubmit();
        }
      });
    }
  };

  // Use current location as origin
  useCurrentLocationAsOrigin = () => {
    const { userLocation } = this.state;

    if (!userLocation) {
      Alert.alert('Error', 'Unable to get your current location. Please try again.');
      return;
    }

    // Fetch address from coordinates for display purposes
    this.reverseGeocode(userLocation, (address) => {
      const locationDetails = {
        geometry: {
          location: {
            lat: userLocation.latitude,
            lng: userLocation.longitude
          }
        },
        formatted_address: address
      };

      this.setState({ origin: locationDetails }, () => {
        // Update the text in the origin input
        if (this.originRef) {
          this.originRef.setAddressText(address);
        }

        // If both origin and destination are set, calculate route
        if (this.state.origin && this.state.destination) {
          this.handleRouteSubmit();
        }
      });
    });
  };

  // Reverse geocode coordinates to address
  reverseGeocode = (coordinates, callback) => {
    const apiKey = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${apiKey}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.status === 'OK') {
          const address = data.results[0].formatted_address;
          callback(address);
        } else {
          callback('Current Location');
        }
      })
      .catch(error => {
        console.error('Reverse geocoding error:', error);
        callback('Current Location');
      });
  };

  // Clear both inputs
  clearInputs = () => {
    if (this.originRef) {
      this.originRef.setAddressText('');
    }
    if (this.destinationRef) {
      this.destinationRef.setAddressText('');
    }
    this.setState({
      origin: null,
      destination: null
    });

    // Notify parent that route is cleared
    if (this.props.onRouteClear) {
      this.props.onRouteClear();
    }
  };

  // Validate route and submit
  handleRouteSubmit = () => {
    const { origin, destination } = this.state;

    // Validate inputs
    if (!origin) {
      Alert.alert('Error', 'Please select a starting location');
      return;
    }

    if (!destination) {
      Alert.alert('Error', 'Please select a destination');
      return;
    }

    // Ensure we have coordinates
    const originCoords = origin.geometry?.location;
    const destCoords = destination.geometry?.location;

    if (!originCoords || !destCoords) {
      Alert.alert('Error', 'Invalid location data. Please try again.');
      return;
    }

    // Check if origin and destination are too close
    const distance = this.calculateDistance(
      originCoords.lat,
      originCoords.lng,
      destCoords.lat,
      destCoords.lng
    );

    if (distance < 0.1) { // Less than 100 meters
      Alert.alert(
        'Warning',
        'Origin and destination are very close. Are you sure you want to get directions?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Continue',
            onPress: () => this.submitValidRoute(origin, destination)
          }
        ]
      );
    } else {
      this.submitValidRoute(origin, destination);
    }
  };

  // Calculate distance between two coordinates in kilometers using Haversine formula
  calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };

  deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  // Submit valid route to parent component
  submitValidRoute = (origin, destination) => {
    if (this.props.onRouteSelect) {
      this.props.onRouteSelect(origin, destination);
    }
  };

  render() {
    const { loading, locationPermission } = this.state;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Route Planner</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <View style={styles.inputContainer}>
            <View style={styles.autocompleteContainer}>
              <GooglePlacesAutocomplete
                ref={(ref) => this.originRef = ref}
                placeholder="Enter starting point"
                minLength={2}
                autoFocus={false}
                returnKeyType={'search'}
                keyboardAppearance={'light'}
                listViewDisplayed={false}
                fetchDetails={true}
                renderDescription={row => row.description}
                onPress={this.handleOriginSelect}
                getDefaultValue={() => ''}
                query={{
                  key: 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA',
                  language: 'en',
                  types: 'address',
                }}
                styles={{
                  textInputContainer: styles.textInputContainer,
                  textInput: styles.textInput,
                  description: styles.description,
                  predefinedPlacesDescription: styles.predefinedPlacesDescription,
                  listView: styles.listView,
                }}
                nearbyPlacesAPI='GooglePlacesSearch'
                debounce={200}
              />

              {locationPermission && (
                <TouchableOpacity
                  style={styles.currentLocationButton}
                  onPress={this.useCurrentLocationAsOrigin}
                >
                  <Text style={styles.buttonText}>Use Current Location</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.autocompleteContainer}>
              <GooglePlacesAutocomplete
                ref={(ref) => this.destinationRef = ref}
                placeholder="Enter destination"
                minLength={2}
                autoFocus={false}
                returnKeyType={'search'}
                keyboardAppearance={'light'}
                listViewDisplayed={false}
                fetchDetails={true}
                renderDescription={row => row.description}
                onPress={this.handleDestinationSelect}
                getDefaultValue={() => ''}
                query={{
                  key: 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA',
                  language: 'en',
                  types: 'address',
                }}
                styles={{
                  textInputContainer: styles.textInputContainer,
                  textInput: styles.textInput,
                  description: styles.description,
                  predefinedPlacesDescription: styles.predefinedPlacesDescription,
                  listView: styles.listView,
                }}
                nearbyPlacesAPI='GooglePlacesSearch'
                debounce={200}
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={this.handleRouteSubmit}>
                <Text style={styles.buttonText}>Calculate Route</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={this.clearInputs}>
                <Text style={styles.buttonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
  },
  autocompleteContainer: {
    marginBottom: 15,
    zIndex: 1,
  },
  textInputContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0)',
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  textInput: {
    marginLeft: 0,
    marginRight: 0,
    height: 45,
    color: '#5d5d5d',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingLeft: 10,
  },
  description: {
    fontWeight: 'bold',
    color: '#1faadb',
  },
  predefinedPlacesDescription: {
    color: '#1faadb',
  },
  listView: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginHorizontal: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { x: 0, y: 0 },
    shadowRadius: 15,
    zIndex: 9999,
  },
  currentLocationButton: {
    marginTop: 5,
    padding: 10,
    backgroundColor: '#1a73e8',
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#1a73e8',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RouteInput;