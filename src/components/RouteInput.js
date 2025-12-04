import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import LocationInput from './LocationInput';
import Map from './MapView';
import {
  validateRoute,
  validateRouteWithAlerts,
  formatDistance,
  formatDuration
} from '../utils/RouteUtils';
import { isValidLocation } from '../utils/PermissionUtils';

const RouteInput = ({ onRouteSelected }) => {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [validationErrors, setValidationErrors] = useState({
    origin: false,
    destination: false,
  });

  // Clear validation errors when location is selected
  useEffect(() => {
    if (origin && isValidLocation(origin) && validationErrors.origin) {
      setValidationErrors(prev => ({ ...prev, origin: false }));
    }
  }, [origin]);

  useEffect(() => {
    if (destination && isValidLocation(destination) && validationErrors.destination) {
      setValidationErrors(prev => ({ ...prev, destination: false }));
    }
  }, [destination]);

  const checkValidationErrors = useCallback(() => {
    let isValid = true;
    const newErrors = { origin: false, destination: false };

    if (!origin || !isValidLocation(origin)) {
      newErrors.origin = true;
      isValid = false;
    }

    if (!destination || !isValidLocation(destination)) {
      newErrors.destination = true;
      isValid = false;
    }

    setValidationErrors(newErrors);
    return isValid;
  }, [origin, destination]);

  const handleRouteCalculated = (details) => {
    setRouteDetails(details);

    // If a callback was provided by parent component
    if (onRouteSelected && origin && destination && validateRoute(origin, destination)) {
      onRouteSelected({
        origin,
        destination,
        details,
      });
    }
  };

  const handleCalculateRoute = () => {
    if (!checkValidationErrors()) {
      return;
    }

    // Use the utility function for validation with alerts
    if (!validateRouteWithAlerts(origin, destination)) {
      return;
    }

    // The route is being displayed and calculated by the Map component
    // This function mainly validates the inputs before focusing the map
    Alert.alert(
      'Route Validated',
      'Your route has been validated and is being displayed on the map.',
      [{ text: 'OK' }]
    );
  };

  // Format route details for display using utility functions
  const getFormattedDistance = () => {
    if (!routeDetails || !routeDetails.distance) return 'N/A';
    return formatDistance(routeDetails.distance);
  };

  const getFormattedDuration = () => {
    if (!routeDetails || !routeDetails.duration) return 'N/A';
    return formatDuration(routeDetails.duration);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputContainer}>
          <LocationInput
            placeholder="Starting Location"
            onLocationSelected={setOrigin}
            currentLocationLabel="Current Location (Start)"
          />
          {validationErrors.origin && (
            <Text style={styles.errorText}>Please select a starting location</Text>
          )}

          <LocationInput
            placeholder="Final Destination"
            onLocationSelected={setDestination}
            currentLocationLabel="Current Location (End)"
          />
          {validationErrors.destination && (
            <Text style={styles.errorText}>Please select a destination</Text>
          )}
        </View>

        {/* Map view */}
        <View style={styles.mapContainer}>
          <Map
            origin={origin}
            destination={destination}
            onRouteCalculated={handleRouteCalculated}
          />
        </View>

        {/* Route details */}
        {routeDetails && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Route Details</Text>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Distance:</Text>
              <Text style={styles.detailsValue}>{getFormattedDistance()}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Duration:</Text>
              <Text style={styles.detailsValue}>{getFormattedDuration()}</Text>
            </View>
          </View>
        )}

        {/* Calculate button */}
        <TouchableOpacity
          style={styles.calculateButton}
          onPress={handleCalculateRoute}
        >
          <Text style={styles.calculateButtonText}>Calculate Route</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  scrollContainer: {
    flex: 1,
  },
  inputContainer: {
    padding: 10,
    zIndex: 2, // Ensure inputs appear above map
    backgroundColor: '#F5FCFF',
  },
  mapContainer: {
    height: 350,
    marginVertical: 10,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailsLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailsValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  calculateButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 20,
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 5,
    marginLeft: 5,
  },
});

export default RouteInput;