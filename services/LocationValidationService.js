/**
 * @flow
 * Background location validation service
 */

import { NetInfo } from 'react-native';

/**
 * Validates location data is complete and valid
 */
const validateLocation = (location) => {
  if (!location) {
    return {
      isValid: false,
      errors: ['Location is required'],
    };
  }

  const errors = [];

  if (!location.name || location.name.trim() === '') {
    errors.push('Location name is required');
  }

  if (!location.address || location.address.trim() === '') {
    errors.push('Location address is required');
  }

  if (typeof location.latitude !== 'number' || location.latitude < -90 || location.latitude > 90) {
    errors.push('Invalid latitude');
  }

  if (typeof location.longitude !== 'number' || location.longitude < -180 || location.longitude > 180) {
    errors.push('Invalid longitude');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Checks if device is online
 */
const checkConnectivity = async () => {
  try {
    const isConnected = await NetInfo.isConnected.fetch();
    return isConnected;
  } catch (error) {
    console.error('Error checking connectivity:', error);
    return false;
  }
};

/**
 * Validates location with network awareness
 */
const validateLocationWithConnectivity = async (location) => {
  const basicValidation = validateLocation(location);

  if (!basicValidation.isValid) {
    return {
      ...basicValidation,
      validated: false,
      isOffline: false,
    };
  }

  try {
    const isOnline = await checkConnectivity();
    return {
      isValid: true,
      errors: [],
      validated: isOnline,
      isOffline: !isOnline,
    };
  } catch (error) {
    console.error('Error during validation:', error);
    return {
      isValid: true,
      errors: [],
      validated: false,
      isOffline: true,
    };
  }
};

module.exports = {
  validateLocation,
  checkConnectivity,
  validateLocationWithConnectivity,
};
