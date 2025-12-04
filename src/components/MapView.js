import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import {
  ensureLocationPermission,
  getCurrentLocation as getLocation,
  isValidLocation
} from '../utils/PermissionUtils';
import { validateRouteWithAlerts } from '../utils/RouteUtils';

const GOOGLE_MAPS_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA'; // Using the same API key found in the autocomplete component

const Map = ({ origin, destination, onRouteCalculated }) => {
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [routeDetails, setRouteDetails] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Request location permission when component mounts
    handleLocationPermission();
  }, []);

  useEffect(() => {
    // If both origin and destination are set, fit map to show both markers
    if (origin && destination && validateRouteWithAlerts(origin, destination)) {
      fitMapToMarkers();
    } else if (origin && isValidLocation(origin)) {
      // If only origin is set, center map on origin
      setRegion({
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [origin, destination]);

  const handleLocationPermission = async () => {
    ensureLocationPermission(
      // On permission granted
      () => {
        getCurrentLocation();
      },
      // On permission denied
      () => {
        console.warn('Location permission denied');
      }
    );
  };

  const getCurrentLocation = async () => {
    try {
      const position = await getLocation();
      setRegion({
        latitude: position.latitude,
        longitude: position.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const fitMapToMarkers = () => {
    if (!origin || !destination || !mapRef.current) return;

    mapRef.current.fitToCoordinates(
      [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude },
      ],
      {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      }
    );
  };

  const onRouteReady = (result) => {
    // Validate route before processing
    if (result && result.distance && result.duration) {
      setRouteDetails({
        distance: result.distance,
        duration: result.duration,
      });

      // Pass route details to parent component
      if (onRouteCalculated) {
        onRouteCalculated({
          distance: result.distance,
          duration: result.duration,
          coordinates: result.coordinates,
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {origin && (
          <Marker
            coordinate={{
              latitude: origin.latitude,
              longitude: origin.longitude,
            }}
            title="Origin"
            description={origin.description || "Starting Point"}
          />
        )}

        {destination && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title="Destination"
            description={destination.description || "End Point"}
            pinColor="blue"
          />
        )}

        {origin && destination && (
          <MapViewDirections
            origin={{
              latitude: origin.latitude,
              longitude: origin.longitude,
            }}
            destination={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor="#1a66ff"
            optimizeWaypoints={true}
            onReady={onRouteReady}
            onError={(error) => console.error('Directions error:', error)}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.6,
  },
});

export default Map;