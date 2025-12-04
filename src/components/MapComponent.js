/**
 * MapComponent.js
 * Displays a map with route visualization based on origin and destination
 */
import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import polyline from 'react-native-polyline';
import Permissions from 'react-native-permissions';

class MapComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      region: {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      },
      originCoords: null,
      destCoords: null,
      routeCoordinates: [],
      loadingRoute: false,
      locationPermission: false,
      userLocation: null,
      error: null
    };
  }

  componentDidMount() {
    this.requestLocationPermission();
  }

  componentDidUpdate(prevProps) {
    // Check if origin or destination has changed
    if (
      (prevProps.origin !== this.props.origin && this.props.origin) ||
      (prevProps.destination !== this.props.destination && this.props.destination)
    ) {
      this.updateRouteCoordinates();
    }
  }

  // Request location permission
  requestLocationPermission = async () => {
    try {
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
      this.setState({ error: 'Failed to get location permission' });
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
          region: {
            ...this.state.region,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
        });
      },
      (error) => this.setState({ error: error.message }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  // Update route coordinates based on origin and destination
  updateRouteCoordinates = async () => {
    const { origin, destination } = this.props;

    if (!origin || !destination) {
      return;
    }

    this.setState({ loadingRoute: true });

    try {
      // Get coordinates for origin
      const originCoords = origin.geometry?.location || origin;

      // Get coordinates for destination
      const destCoords = destination.geometry?.location || destination;

      if (originCoords && destCoords) {
        this.setState({
          originCoords,
          destCoords
        });

        // Fetch route directions
        await this.fetchRouteDirections(originCoords, destCoords);
      }
    } catch (error) {
      console.error('Error updating route coordinates:', error);
      Alert.alert('Error', 'Failed to get route directions. Please try again.');
    } finally {
      this.setState({ loadingRoute: false });
    }
  };

  // Fetch route directions from Google Directions API
  fetchRouteDirections = async (originCoords, destCoords) => {
    try {
      const apiKey = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA'; // Using the same key from autocompleteComponent
      const origin = `${originCoords.lat || originCoords.latitude},${originCoords.lng || originCoords.longitude}`;
      const destination = `${destCoords.lat || destCoords.latitude},${destCoords.lng || destCoords.longitude}`;

      const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;

      const response = await fetch(apiUrl);
      const json = await response.json();

      if (json.status !== 'OK') {
        throw new Error(json.status);
      }

      const route = json.routes[0];
      if (!route) {
        throw new Error('No routes found');
      }

      // Decode polyline points
      const points = polyline.decode(route.overview_polyline.points);
      const routeCoordinates = points.map(point => ({
        latitude: point[0],
        longitude: point[1]
      }));

      // Fit map to show the entire route
      this.fitMapToCoordinates(routeCoordinates);

      this.setState({ routeCoordinates });

      // Notify parent component of successful route
      if (this.props.onRouteCalculated) {
        this.props.onRouteCalculated(route);
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
      Alert.alert('Route Error', 'Could not calculate route between these locations.');
      this.setState({ routeCoordinates: [] });
    }
  };

  // Adjust map to fit all coordinates
  fitMapToCoordinates = (coordinates) => {
    if (coordinates.length === 0 || !this.map) {
      return;
    }

    this.map.fitToCoordinates(coordinates, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  };

  render() {
    const {
      region,
      originCoords,
      destCoords,
      routeCoordinates,
      loadingRoute,
      userLocation
    } = this.state;

    return (
      <View style={styles.container}>
        {loadingRoute && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text>Calculating route...</Text>
          </View>
        )}

        <MapView
          ref={map => this.map = map}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsTraffic={true}
        >
          {userLocation && !originCoords && (
            <Marker
              coordinate={userLocation}
              title="Your Location"
              pinColor="blue"
            />
          )}

          {originCoords && (
            <Marker
              coordinate={{
                latitude: originCoords.lat || originCoords.latitude,
                longitude: originCoords.lng || originCoords.longitude
              }}
              title="Origin"
              pinColor="green"
            />
          )}

          {destCoords && (
            <Marker
              coordinate={{
                latitude: destCoords.lat || destCoords.latitude,
                longitude: destCoords.lng || destCoords.longitude
              }}
              title="Destination"
              pinColor="red"
            />
          )}

          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor="#1a73e8"
            />
          )}
        </MapView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1,
  },
});

export default MapComponent;