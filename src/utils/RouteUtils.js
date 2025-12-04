import { Alert } from 'react-native';
import { isValidLocation } from './PermissionUtils';

/**
 * Utility functions for route calculations and validations
 */

/**
 * Validates if both origin and destination locations are valid and available
 * @param {Object} origin The origin location
 * @param {Object} destination The destination location
 * @returns {boolean} True if both locations are valid
 */
export const validateRoute = (origin, destination) => {
  // Check if both origin and destination exist
  if (!origin || !destination) {
    return false;
  }

  // Validate both locations have valid coordinates
  return isValidLocation(origin) && isValidLocation(destination);
};

/**
 * Calculates the distance between two coordinates in kilometers
 * Uses the Haversine formula
 * @param {Object} origin The origin location
 * @param {Object} destination The destination location
 * @returns {number} Distance in kilometers
 */
export const calculateDistanceBetweenPoints = (origin, destination) => {
  if (!isValidLocation(origin) || !isValidLocation(destination)) {
    return 0;
  }

  // Haversine formula
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(destination.latitude - origin.latitude);
  const dLon = deg2rad(destination.longitude - origin.longitude);

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(origin.latitude)) * Math.cos(deg2rad(destination.latitude)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers

  return distance;
};

/**
 * Converts degrees to radians
 * @param {number} deg Degrees
 * @returns {number} Radians
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

/**
 * Validates a route before processing and shows alerts for invalid routes
 * @param {Object} origin The origin location
 * @param {Object} destination The destination location
 * @returns {boolean} True if the route is valid
 */
export const validateRouteWithAlerts = (origin, destination) => {
  if (!origin) {
    Alert.alert('Missing Origin', 'Please select a starting location');
    return false;
  }

  if (!destination) {
    Alert.alert('Missing Destination', 'Please select a destination location');
    return false;
  }

  if (!isValidLocation(origin)) {
    Alert.alert('Invalid Origin', 'The starting location has invalid coordinates');
    return false;
  }

  if (!isValidLocation(destination)) {
    Alert.alert('Invalid Destination', 'The destination has invalid coordinates');
    return false;
  }

  // Check if origin and destination are the same (or very close)
  const distance = calculateDistanceBetweenPoints(origin, destination);
  if (distance < 0.1) { // Less than 100 meters apart
    Alert.alert(
      'Origin and Destination Too Close',
      'The starting point and destination are too close to each other. Please select locations farther apart.'
    );
    return false;
  }

  return true;
};

/**
 * Formats a distance in kilometers to a readable string
 * @param {number} distance Distance in kilometers
 * @returns {string} Formatted distance
 */
export const formatDistance = (distance) => {
  if (distance === undefined || distance === null) return 'N/A';

  if (distance < 1) {
    // Convert to meters for short distances
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} km`;
};

/**
 * Formats a duration in minutes to a readable string
 * @param {number} minutes Duration in minutes
 * @returns {string} Formatted duration
 */
export const formatDuration = (minutes) => {
  if (minutes === undefined || minutes === null) return 'N/A';

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
};