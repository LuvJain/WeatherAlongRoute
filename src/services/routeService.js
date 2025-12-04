/**
 * Route Service - Handles Google Maps integration for routes and waypoints
 */
import { AsyncStorage } from 'react-native';

// Google Maps API key (already included in the GooglePlacesAutocomplete component)
const MAPS_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA'; // Using existing key from GooglePlacesAutocomplete
const DIRECTIONS_BASE_URL = 'https://maps.googleapis.com/maps/api/directions/json';

// Cache keys
const ROUTE_CACHE_KEY = 'route_data_';
// Cache expiration time in milliseconds (1 day)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * Get route information between two points
 * @param {Object} origin - Starting location {lat, lng, description}
 * @param {Object} destination - Ending location {lat, lng, description}
 * @param {Boolean} forceRefresh - Bypass cache if true
 * @returns {Promise} - Route data including waypoints
 */
export const getRouteData = async (origin, destination, forceRefresh = false) => {
  try {
    const cacheKey = ROUTE_CACHE_KEY + `${origin.lat}_${origin.lng}_${destination.lat}_${destination.lng}`;

    // Check cache first (if not forcing refresh)
    if (!forceRefresh) {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);

        // Check if cache is still valid
        const now = new Date().getTime();
        if (parsedData.timestamp && (now - parsedData.timestamp) < CACHE_EXPIRY) {
          console.log('Using cached route data');
          return parsedData.data;
        }
      }
    }

    // Construct the directions URL
    const url = `${DIRECTIONS_BASE_URL}?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${MAPS_API_KEY}`;

    // Fetch the route data
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Directions API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'OK') {
      throw new Error(`Directions API returned status: ${data.status}`);
    }

    // Extract route information
    const route = {
      distance: data.routes[0].legs[0].distance.text,
      duration: data.routes[0].legs[0].duration.text,
      startLocation: {
        lat: data.routes[0].legs[0].start_location.lat,
        lng: data.routes[0].legs[0].start_location.lng,
        address: data.routes[0].legs[0].start_address
      },
      endLocation: {
        lat: data.routes[0].legs[0].end_location.lat,
        lng: data.routes[0].legs[0].end_location.lng,
        address: data.routes[0].legs[0].end_address
      },
      waypoints: extractWaypoints(data.routes[0])
    };

    // Cache the result
    const cacheData = {
      timestamp: new Date().getTime(),
      data: route
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    return route;
  } catch (error) {
    console.error('Error getting route data:', error);
    throw error;
  }
};

/**
 * Extract waypoints from a route for weather data
 * Intelligently samples the route to get a reasonable number of waypoints
 * for displaying weather zones
 * @param {Object} route - Route data from Google Directions API
 * @returns {Array} - Array of waypoint objects {lat, lng, description}
 */
export const extractWaypoints = (route) => {
  if (!route || !route.legs || !route.legs[0] || !route.legs[0].steps) {
    return [];
  }

  const steps = route.legs[0].steps;
  const waypoints = [];

  // Always add the starting point
  waypoints.push({
    lat: route.legs[0].start_location.lat,
    lng: route.legs[0].start_location.lng,
    description: 'Start'
  });

  // Extract points along the route
  // For longer routes, we'll sample intermediate points to cover different weather zones
  const totalDistance = route.legs[0].distance.value; // in meters

  // If the route is very short, just add start and end
  if (totalDistance < 50000) { // Less than 50km
    // Just add the end point
  }
  // For medium routes, sample every 30-50km
  else if (totalDistance < 200000) { // Between 50-200km
    let currentDistance = 0;

    for (const step of steps) {
      currentDistance += step.distance.value;

      // Add a point roughly every 50km
      if (currentDistance > 50000) {
        waypoints.push({
          lat: step.end_location.lat,
          lng: step.end_location.lng,
          description: `Waypoint at ${Math.round(currentDistance/1000)}km`
        });
        currentDistance = 0; // Reset counter
      }
    }
  }
  // For long routes, sample more frequently
  else {
    let currentDistance = 0;

    for (const step of steps) {
      currentDistance += step.distance.value;

      // Add a point roughly every 30km for long routes
      if (currentDistance > 30000) {
        waypoints.push({
          lat: step.end_location.lat,
          lng: step.end_location.lng,
          description: `Waypoint at ${Math.round(currentDistance/1000)}km`
        });
        currentDistance = 0; // Reset counter
      }
    }
  }

  // Always add the ending point
  waypoints.push({
    lat: route.legs[0].end_location.lat,
    lng: route.legs[0].end_location.lng,
    description: 'Destination'
  });

  return waypoints;
};

/**
 * Clear all cached route data
 * @returns {Promise}
 */
export const clearRouteCache = async () => {
  try {
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();

    // Filter out route-related keys
    const routeKeys = keys.filter(key => key.startsWith(ROUTE_CACHE_KEY));

    if (routeKeys.length > 0) {
      await AsyncStorage.multiRemove(routeKeys);
      console.log('Route cache cleared:', routeKeys.length, 'items');
    }

    return true;
  } catch (error) {
    console.error('Error clearing route cache:', error);
    return false;
  }
};