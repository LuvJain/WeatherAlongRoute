/**
 * Weather Criteria Service
 * Handles operations related to driver weather preferences
 */

import { DEFAULT_WEATHER_CRITERIA, createDefaultCriteria } from '../models/weatherCriteria';

// In-memory storage for driver criteria (in a real app, this would be a backend API)
let driverCriteria = {};

/**
 * Get weather criteria for a specific driver
 * @param {string} driverId - The ID of the driver
 * @returns {Object} The driver's weather criteria
 */
export const getDriverCriteria = async (driverId) => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // If driver has no saved criteria, create default
    if (!driverCriteria[driverId]) {
      driverCriteria[driverId] = createDefaultCriteria(driverId);
    }

    return { ...driverCriteria[driverId] };
  } catch (error) {
    console.error('Error fetching driver criteria:', error);
    throw new Error('Failed to get driver criteria');
  }
};

/**
 * Save weather criteria for a driver
 * @param {string} driverId - The ID of the driver
 * @param {Object} criteria - The weather criteria to save
 * @returns {Object} The updated criteria
 */
export const saveDriverCriteria = async (driverId, criteria) => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the criteria with metadata
    const updatedCriteria = {
      ...criteria,
      driverId,
      updatedAt: new Date().toISOString()
    };

    // Save to our "database"
    driverCriteria[driverId] = updatedCriteria;

    return { ...updatedCriteria };
  } catch (error) {
    console.error('Error saving driver criteria:', error);
    throw new Error('Failed to save driver criteria');
  }
};

/**
 * Reset driver criteria to default values
 * @param {string} driverId - The ID of the driver
 * @returns {Object} The default criteria
 */
export const resetDriverCriteria = async (driverId) => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const defaultCriteria = createDefaultCriteria(driverId);
    driverCriteria[driverId] = defaultCriteria;

    return { ...defaultCriteria };
  } catch (error) {
    console.error('Error resetting driver criteria:', error);
    throw new Error('Failed to reset driver criteria');
  }
};

/**
 * Get all driver criteria (admin function)
 * @returns {Array} List of all driver criteria
 */
export const getAllDriverCriteria = async () => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    return Object.values(driverCriteria);
  } catch (error) {
    console.error('Error fetching all driver criteria:', error);
    throw new Error('Failed to get all driver criteria');
  }
};

// Initialize with some sample data
(async () => {
  await saveDriverCriteria('driver1', {
    ...DEFAULT_WEATHER_CRITERIA,
    temperature: {
      min: -5,
      max: 35,
      preferred: 22
    },
    windSpeed: {
      max: 40,
      preferred: 5
    },
    allowedConditions: [
      'clear',
      'clouds',
      'partlyCloudy',
      'overcast',
      'drizzle'
    ]
  });

  await saveDriverCriteria('driver2', {
    ...DEFAULT_WEATHER_CRITERIA,
    temperature: {
      min: 0,
      max: 30,
      preferred: 18
    },
    precipitation: {
      max: 5,
      preferred: 0
    },
    disallowedConditions: [
      'thunderstorm',
      'heavyRain',
      'tornado',
      'hurricane',
      'snow'
    ]
  });
})();