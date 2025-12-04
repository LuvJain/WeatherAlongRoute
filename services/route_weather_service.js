/**
 * Route Weather Service
 * Combines Maps and Weather APIs to provide weather data along a route
 */

import mapsService from './integrations/maps_service';
import weatherService from './integrations/weather_service';
import logger from './utils/logger';

/**
 * Get weather data for a route between two locations
 *
 * @param {Object} startLocation - Starting location (can be place_id, lat/lng, or address)
 * @param {Object} endLocation - Destination location (can be place_id, lat/lng, or address)
 * @param {Array} waypoints - Optional array of waypoints
 * @param {String} travelMode - Travel mode (driving, walking, bicycling, transit)
 * @param {String} units - Units for weather data (standard, metric, imperial)
 * @returns {Promise<Object>} - Route data with weather information
 */
const getRouteWithWeather = async (
  startLocation,
  endLocation,
  waypoints = [],
  travelMode = 'driving',
  units = 'metric'
) => {
  try {
    logger.info('Getting route with weather', {
      start: startLocation,
      end: endLocation,
      travelMode,
      units
    });

    // Step 1: Get route information from Maps API
    const routeData = await mapsService.getDirections(
      startLocation,
      endLocation,
      waypoints,
      travelMode
    );

    // Extract the first (recommended) route
    const primaryRoute = routeData.routes[0];

    // Step 2: Get weather data for checkpoints along the route
    const weatherData = await weatherService.getRouteWeather(
      primaryRoute.weatherCheckpoints,
      units
    );

    // Step 3: Combine route and weather data
    const routeWithWeather = {
      ...primaryRoute,
      weather: weatherData.map((weather, index) => ({
        ...weather,
        locationIndex: index,
        checkpoint: primaryRoute.weatherCheckpoints[index],
        summary: weatherService.getWeatherSummary(weather)
      }))
    };

    return {
      status: 'OK',
      route: routeWithWeather
    };
  } catch (error) {
    logger.error('Error getting route with weather', error, {
      start: startLocation,
      end: endLocation
    });

    return {
      status: 'ERROR',
      error: error.message,
      route: null
    };
  }
};

/**
 * Get current weather for a specific location
 *
 * @param {Object|String} location - Location (can be coordinates, place_id, or address string)
 * @param {String} units - Units for weather data (standard, metric, imperial)
 * @returns {Promise<Object>} - Weather data for the location
 */
const getLocationWeather = async (location, units = 'metric') => {
  try {
    logger.info('Getting location weather', { location, units });

    // If it's not a coordinate object, geocode it first
    let coordinates;

    if (typeof location === 'string' || location.place_id) {
      // Geocode to get coordinates
      const geocodeResult = await mapsService.geocodeAddress(
        typeof location === 'string' ? location : location.place_id
      );
      coordinates = geocodeResult.location;
    } else {
      // Assume it's already a coordinates object
      coordinates = {
        lat: location.lat || location.latitude,
        lng: location.lng || location.longitude
      };
    }

    // Get weather data for the coordinates
    const weatherData = await weatherService.getCurrentWeather(coordinates, units);

    return {
      status: 'OK',
      weather: {
        ...weatherData,
        summary: weatherService.getWeatherSummary(weatherData)
      }
    };
  } catch (error) {
    logger.error('Error getting location weather', error, { location });

    return {
      status: 'ERROR',
      error: error.message,
      weather: null
    };
  }
};

export default {
  getRouteWithWeather,
  getLocationWeather
};