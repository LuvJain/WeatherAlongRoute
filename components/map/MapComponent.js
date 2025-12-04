/**
 * MapComponent.js
 * Renders an interactive map with route visualization
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Platform } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import polyline from 'react-native-polyline-decoder';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const DEFAULT_LATITUDE_DELTA = 0.0922;

const MapComponent = ({
  route,
  startLocation,
  endLocation,
  weatherCheckpoints,
  isLoading,
  onWaypointPress,
  selectedWaypoint,
}) => {
  const [mapRegion, setMapRegion] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const mapRef = useRef(null);

  // Decode polyline and set map region when route changes
  useEffect(() => {
    if (route && route.polyline) {
      // Decode Google's encoded polyline format to get an array of coordinates
      const coordinates = polyline.decode(route.polyline).map(point => ({
        latitude: point[0],
        longitude: point[1]
      }));

      setRouteCoordinates(coordinates);

      if (coordinates.length > 0) {
        // Calculate the bounding region for the route
        const latitudes = coordinates.map(coord => coord.latitude);
        const longitudes = coordinates.map(coord => coord.longitude);

        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);

        const latitudeDelta = maxLat - minLat + 0.02; // Add padding
        const longitudeDelta = maxLng - minLng + 0.02;

        // Set the map region to fit the route
        const newRegion = {
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max(latitudeDelta, DEFAULT_LATITUDE_DELTA),
          longitudeDelta: Math.max(longitudeDelta, DEFAULT_LATITUDE_DELTA * ASPECT_RATIO)
        };

        setMapRegion(newRegion);

        // Animate the map to the new region
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      }
    }
  }, [route]);

  // Set map region based on selected locations when no route is available
  useEffect(() => {
    if (!route && startLocation && startLocation.coordinates) {
      const initialRegion = {
        latitude: startLocation.coordinates.lat,
        longitude: startLocation.coordinates.lng,
        latitudeDelta: DEFAULT_LATITUDE_DELTA,
        longitudeDelta: DEFAULT_LATITUDE_DELTA * ASPECT_RATIO
      };
      setMapRegion(initialRegion);
    }
  }, [startLocation, route]);

  // Handle selected waypoint by centering the map on it
  useEffect(() => {
    if (selectedWaypoint && mapRef.current) {
      const waypointRegion = {
        latitude: selectedWaypoint.checkpoint.lat,
        longitude: selectedWaypoint.checkpoint.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01 * ASPECT_RATIO
      };

      mapRef.current.animateToRegion(waypointRegion, 500);
    }
  }, [selectedWaypoint]);

  // If location data isn't loaded yet, show a default region (San Francisco)
  const defaultRegion = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: DEFAULT_LATITUDE_DELTA,
    longitudeDelta: DEFAULT_LATITUDE_DELTA * ASPECT_RATIO
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1faadb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={defaultRegion}
        region={mapRegion || defaultRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        showsTraffic={Platform.OS === 'ios'} // Traffic layer is iOS-only
      >
        {/* Display the route polyline if available */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="#1faadb"
          />
        )}

        {/* Display start location marker */}
        {startLocation && startLocation.coordinates && (
          <Marker
            coordinate={{
              latitude: startLocation.coordinates.lat,
              longitude: startLocation.coordinates.lng
            }}
            title="Start"
            description={startLocation.description || "Starting point"}
            pinColor="green"
          />
        )}

        {/* Display end location marker */}
        {endLocation && endLocation.coordinates && (
          <Marker
            coordinate={{
              latitude: endLocation.coordinates.lat,
              longitude: endLocation.coordinates.lng
            }}
            title="Destination"
            description={endLocation.description || "Destination"}
            pinColor="red"
          />
        )}

        {/* Display weather checkpoint markers */}
        {weatherCheckpoints && weatherCheckpoints.map((checkpoint, index) => (
          <Marker
            key={`checkpoint-${index}`}
            coordinate={{
              latitude: checkpoint.checkpoint.lat,
              longitude: checkpoint.checkpoint.lng
            }}
            title={`Weather Checkpoint ${index + 1}`}
            description={checkpoint.summary || checkpoint.weather.description}
            pinColor={selectedWaypoint && selectedWaypoint.locationIndex === index ? "blue" : "orange"}
            onPress={() => onWaypointPress && onWaypointPress(checkpoint)}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    margin: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
});

export default MapComponent;