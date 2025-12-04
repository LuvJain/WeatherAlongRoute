/**
 * Weather Service - Handles OpenWeatherMap API integration
 * Fetches weather data for route waypoints
 */
import { AsyncStorage } from 'react-native';

// OpenWeatherMap API key (replace with your actual API key)
const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Cache expiration time in milliseconds (1 hour)
const CACHE_EXPIRY = 60 * 60 * 1000;

/**
 * Fetch weather data for a specific location
 * @param {Number} lat - Latitude
 * @param {Number} lon - Longitude
 * @param {Boolean} forceRefresh - Bypass cache if true
 * @returns {Promise} - Weather data object
 */
export const fetchWeatherForLocation = async (lat, lon, forceRefresh = false) => {
  try {
    const cacheKey = `weather_${lat}_${lon}`;

    // Check cache first (if not forcing refresh)
    if (!forceRefresh) {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);

        // Check if cache is still valid
        const now = new Date().getTime();
        if (parsedData.timestamp && (now - parsedData.timestamp) < CACHE_EXPIRY) {
          console.log('Using cached weather data for', lat, lon);
          return parsedData.data;
        }
      }
    }

    // Fetch from API
    const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the result
    const cacheData = {
      timestamp: new Date().getTime(),
      data
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    return data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
};

/**
 * Fetch forecast data for a specific location
 * @param {Number} lat - Latitude
 * @param {Number} lon - Longitude
 * @param {Boolean} forceRefresh - Bypass cache if true
 * @returns {Promise} - Forecast data object
 */
export const fetchForecastForLocation = async (lat, lon, forceRefresh = false) => {
  try {
    const cacheKey = `forecast_${lat}_${lon}`;

    // Check cache first (if not forcing refresh)
    if (!forceRefresh) {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);

        // Check if cache is still valid
        const now = new Date().getTime();
        if (parsedData.timestamp && (now - parsedData.timestamp) < CACHE_EXPIRY) {
          console.log('Using cached forecast data for', lat, lon);
          return parsedData.data;
        }
      }
    }

    // Fetch from API
    const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the result
    const cacheData = {
      timestamp: new Date().getTime(),
      data
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    return data;
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    throw error;
  }
};

/**
 * Fetch weather data for multiple waypoints along a route
 * @param {Array} waypoints - Array of {lat, lon} objects
 * @param {Boolean} forceRefresh - Bypass cache if true
 * @returns {Promise} - Array of weather data objects
 */
export const fetchWeatherForRoute = async (waypoints, forceRefresh = false) => {
  try {
    const waypointPromises = waypoints.map(waypoint =>
      fetchWeatherForLocation(waypoint.lat, waypoint.lon, forceRefresh)
    );

    return await Promise.all(waypointPromises);
  } catch (error) {
    console.error('Error fetching route weather data:', error);
    throw error;
  }
};

/**
 * Clear all cached weather data
 * @returns {Promise}
 */
export const clearWeatherCache = async () => {
  try {
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();

    // Filter out weather-related keys
    const weatherKeys = keys.filter(key =>
      key.startsWith('weather_') || key.startsWith('forecast_')
    );

    if (weatherKeys.length > 0) {
      await AsyncStorage.multiRemove(weatherKeys);
      console.log('Weather cache cleared:', weatherKeys.length, 'items');
    }

    return true;
  } catch (error) {
    console.error('Error clearing weather cache:', error);
    return false;
  }
};