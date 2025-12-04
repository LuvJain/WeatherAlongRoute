/**
 * Google Maps API integration service
 * Provides route generation and geolocation functions
 */

import config from '../config';
import httpClient from '../utils/httpClient';
import logger from '../utils/logger';

/**
 * Get driving directions between two locations
 *
 * @param {Object} startLocation - Starting location (can be place_id, lat/lng, or address)
 * @param {Object} endLocation - Destination location (can be place_id, lat/lng, or address)
 * @param {Array} waypoints - Optional array of waypoints
 * @param {String} mode - Travel mode (driving, walking, bicycling, transit)
 * @returns {Promise<Object>} - Route information including polyline, duration, distance, etc.
 */
const getDirections = async (
  startLocation,
  endLocation,
  waypoints = [],
  mode = 'driving'
) => {
  try {
    logger.info('Fetching directions', {
      startLocation,
      endLocation,
      waypoints: waypoints.length,
      mode
    });

    // Format origin and destination based on what type of location object is provided
    const origin = formatLocationParam(startLocation);
    const destination = formatLocationParam(endLocation);

    // Build URL with query parameters
    let url = `${config.GOOGLE_MAPS_DIRECTIONS_API}?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${config.GOOGLE_MAPS_API_KEY}`;

    // Add waypoints if provided
    if (waypoints.length > 0) {
      const waypointsStr = waypoints
        .map(wp => formatLocationParam(wp))
        .map(wp => encodeURIComponent(wp))
        .join('|');

      url += `&waypoints=${waypointsStr}`;
    }

    // Request alternatives and route details
    url += '&alternatives=true';

    // Make the API request
    const data = await httpClient.fetchWithRetry(
      url,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      },
      'Google Maps Directions API'
    );

    // Process and transform the response data
    return processDirectionsResponse(data);
  } catch (error) {
    logger.error('Error fetching directions', error, {
      startLocation,
      endLocation
    });
    throw error;
  }
};

/**
 * Process and transform the Google Maps Directions API response
 *
 * @param {Object} response - Raw API response
 * @returns {Object} - Processed route data
 */
const processDirectionsResponse = (response) => {
  // Check if the API returned a valid response
  if (response.status !== 'OK') {
    logger.warn('Google Directions API returned non-OK status', { status: response.status });
    throw new Error(`Google Directions API error: ${response.status}`);
  }

  // Extract routes
  const routes = response.routes.map(route => {
    // Get the first leg (for now we're not handling multi-leg routes)
    const leg = route.legs[0];

    // Extract waypoints along the route for weather checks
    const steps = leg.steps.map(step => ({
      startLocation: step.start_location,
      endLocation: step.end_location,
      distance: step.distance,
      duration: step.duration,
      instructions: step.html_instructions
    }));

    // Calculate waypoints for weather checks (approximately every 50km)
    const weatherCheckpoints = extractWeatherCheckpoints(steps);

    return {
      summary: route.summary,
      distance: {
        text: leg.distance.text,
        value: leg.distance.value // in meters
      },
      duration: {
        text: leg.duration.text,
        value: leg.duration.value // in seconds
      },
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      startLocation: leg.start_location,
      endLocation: leg.end_location,
      steps: steps,
      weatherCheckpoints: weatherCheckpoints,
      polyline: route.overview_polyline.points // Encoded polyline for the route
    };
  });

  return {
    status: response.status,
    routes: routes
  };
};

/**
 * Extract weather checkpoints along a route approximately every 50km
 *
 * @param {Array} steps - Route steps from Google Directions API
 * @returns {Array} - Array of coordinates for weather checks
 */
const extractWeatherCheckpoints = (steps) => {
  const checkpoints = [];
  let distanceCovered = 0;
  const checkpointInterval = 50000; // 50 kilometers in meters

  // Always include the starting point
  if (steps.length > 0) {
    checkpoints.push(steps[0].startLocation);
  }

  // Add points approximately every 50km
  steps.forEach(step => {
    distanceCovered += step.distance.value;

    if (distanceCovered >= checkpointInterval) {
      checkpoints.push(step.endLocation);
      distanceCovered = 0; // Reset the counter
    }
  });

  // Always include the endpoint if we have steps
  if (steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    // Add endpoint if it's not already the last checkpoint
    if (checkpoints[checkpoints.length - 1] !== lastStep.endLocation) {
      checkpoints.push(lastStep.endLocation);
    }
  }

  return checkpoints;
};

/**
 * Format a location parameter based on its type
 *
 * @param {Object|String} location - Location as place_id, coordinates object, or address string
 * @returns {String} - Formatted location string for the API
 */
const formatLocationParam = (location) => {
  // If it's a string, assume it's a place_id or address
  if (typeof location === 'string') {
    // Check if it's a place_id
    if (location.startsWith('place_id:')) {
      return location;
    }
    // Otherwise, assume it's an address string
    return location;
  }

  // If it's an object with place_id property, use that
  if (location.place_id) {
    return `place_id:${location.place_id}`;
  }

  // If it has lat/lng properties, format as coordinates
  if (location.lat !== undefined && location.lng !== undefined) {
    return `${location.lat},${location.lng}`;
  }

  // If it has latitude/longitude properties, format as coordinates
  if (location.latitude !== undefined && location.longitude !== undefined) {
    return `${location.latitude},${location.longitude}`;
  }

  // Fall back to stringifying the object (will probably not work with the API)
  logger.warn('Unrecognized location format', { location });
  return JSON.stringify(location);
};

/**
 * Geocode an address to coordinates
 *
 * @param {String} address - Address to geocode
 * @returns {Promise<Object>} - Geocoding result with lat/lng
 */
const geocodeAddress = async (address) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${config.GOOGLE_MAPS_API_KEY}`;

    const data = await httpClient.fetchWithRetry(
      url,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      },
      'Google Maps Geocoding API'
    );

    if (data.status !== 'OK' || !data.results || !data.results[0]) {
      logger.warn('Geocoding failed or returned no results', { status: data.status });
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    return {
      formatted_address: data.results[0].formatted_address,
      location: data.results[0].geometry.location,
      place_id: data.results[0].place_id
    };
  } catch (error) {
    logger.error('Error geocoding address', error, { address });
    throw error;
  }
};

export default {
  getDirections,
  geocodeAddress
};