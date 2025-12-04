import { Platform, Alert } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

/**
 * Utility functions for handling permissions in the app
 */

/**
 * Gets the appropriate location permission based on platform
 */
export const getLocationPermission = () => {
  return Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    default: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  });
};

/**
 * Checks if location permission is already granted
 * @returns {Promise<boolean>} True if permission is granted
 */
export const checkLocationPermission = async () => {
  try {
    const permission = getLocationPermission();
    const result = await check(permission);

    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
};

/**
 * Requests location permission from the user
 * @returns {Promise<boolean>} True if permission is granted
 */
export const requestLocationPermission = async () => {
  try {
    const permission = getLocationPermission();
    const result = await request(permission);

    return result === RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Checks and requests location permission if needed, shows an alert if denied
 * @param {Function} onGranted Callback for when permission is granted
 * @param {Function} onDenied Optional callback for when permission is denied
 */
export const ensureLocationPermission = async (onGranted, onDenied) => {
  // First check if we already have permission
  const hasPermission = await checkLocationPermission();

  if (hasPermission) {
    // We already have permission
    if (onGranted) onGranted();
    return true;
  }

  // Request permission
  const permissionGranted = await requestLocationPermission();

  if (permissionGranted) {
    if (onGranted) onGranted();
    return true;
  } else {
    // Show alert explaining why we need this permission
    Alert.alert(
      'Location Permission Required',
      'This app needs access to your location to show your position on the map and calculate routes. Please enable location permission in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            // On iOS this will open the app settings
            // On Android it's not as reliable but will try to open app settings
            Linking.openSettings().catch(() => {
              Alert.alert('Unable to open settings', 'Please open settings manually and enable location permission.');
            });
          }
        }
      ]
    );

    if (onDenied) onDenied();
    return false;
  }
};

/**
 * Gets the current location using the Geolocation API
 * @returns {Promise<Object>} Location object with latitude and longitude
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      error => {
        console.error('Error getting current location:', error);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
};

/**
 * Validates if location data is complete and usable for routing
 * @param {Object} location The location object to validate
 * @returns {boolean} True if the location is valid
 */
export const isValidLocation = (location) => {
  return !!(
    location &&
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    !isNaN(location.latitude) &&
    !isNaN(location.longitude)
  );
};