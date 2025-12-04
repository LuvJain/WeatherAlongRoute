/**
 * Route Weather Service
 * Main service that combines route data with weather information
 */

import { fetchRouteData, getOptimizedWaypoints } from '../api/googleMapsApi';
import {
  fetchCurrentWeather,
  fetchWeatherForecast,
  getWeatherAtTime,
  interpolateWeather
} from '../api/weatherApi';
import routeWeatherCache from '../utils/cache';
import { calculateArrivalTime } from '../utils/timeUtils';

/**
 * Gets weather data for a route
 * @param {Object} startLocation - Starting location object {lat, lng}
 * @param {Object} endLocation - Destination location object {lat, lng}
 * @returns {Promise<Object>} - Route with weather information
 */
export const getRouteWeather = async (startLocation, endLocation) => {
  try {
    // Generate cache key
    const cacheKey = routeWeatherCache.constructor.generateKey(startLocation, endLocation);

    // Check cache first
    const cachedData = routeWeatherCache.get(cacheKey);
    if (cachedData) {
      console.log('Using cached route weather data');
      return cachedData;
    }

    // Fetch route data from Google Maps API
    const routeData = await fetchRouteData(startLocation, endLocation);

    // Extract waypoints with optimization for long routes
    const waypoints = getOptimizedWaypoints(routeData);

    // Get weather data for each waypoint
    const waypointsWithWeather = await addWeatherToWaypoints(waypoints);

    // Prepare result with route and weather information
    const result = {
      route: routeData,
      waypoints: waypointsWithWeather,
      summary: {
        distance: routeData.routes[0].legs.reduce((sum, leg) => sum + leg.distance.value, 0),
        duration: routeData.routes[0].legs.reduce((sum, leg) => sum + leg.duration.value, 0),
        startLocationWeather: waypointsWithWeather[0]?.weather,
        endLocationWeather: waypointsWithWeather[waypointsWithWeather.length - 1]?.weather,
        weatherChanges: detectSignificantWeatherChanges(waypointsWithWeather)
      }
    };

    // Cache the result
    routeWeatherCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error in getRouteWeather:', error);
    throw error;
  }
};

/**
 * Adds weather information to route waypoints
 * @param {Array} waypoints - Array of route waypoints
 * @returns {Promise<Array>} - Waypoints with added weather data
 */
const addWeatherToWaypoints = async (waypoints) => {
  if (!waypoints || waypoints.length === 0) {
    return [];
  }

  try {
    // Fetch current weather for the start point
    const currentWeather = await fetchCurrentWeather(waypoints[0].location);

    // Fetch forecast for the route
    const startForecast = await fetchWeatherForecast(waypoints[0].location);

    // If route is long, also get forecast for middle and end points
    let midForecast = startForecast;
    let endForecast = startForecast;

    const totalDistance = waypoints[waypoints.length - 1].distanceFromStart;

    if (totalDistance > 200000) { // 200km
      // For routes over 200km, get additional forecasts for better accuracy
      const midIndex = Math.floor(waypoints.length / 2);
      midForecast = await fetchWeatherForecast(waypoints[midIndex].location);

      // For routes over 500km, get end forecast too
      if (totalDistance > 500000) { // 500km
        endForecast = await fetchWeatherForecast(waypoints[waypoints.length - 1].location);
      }
    }

    // Process each waypoint to add weather data
    const waypointsWithWeather = waypoints.map(waypoint => {
      // Calculate arrival time as Unix timestamp
      const arrivalTimestamp = calculateArrivalTime(waypoint.arrivalTime);

      // Determine which forecast to use based on distance
      let forecast;
      if (totalDistance > 500000) {
        // For long routes, use the nearest forecast source
        const distanceRatio = waypoint.distanceFromStart / totalDistance;
        if (distanceRatio < 0.33) {
          forecast = startForecast;
        } else if (distanceRatio < 0.66) {
          forecast = midForecast;
        } else {
          forecast = endForecast;
        }
      } else if (totalDistance > 200000) {
        // For medium routes, use either start or mid forecast
        const distanceRatio = waypoint.distanceFromStart / totalDistance;
        forecast = distanceRatio < 0.5 ? startForecast : midForecast;
      } else {
        // For short routes, use start forecast for all points
        forecast = startForecast;
      }

      // Get weather for the waypoint's arrival time
      const waypointWeather = getProjectedWeather(forecast, arrivalTimestamp);

      return {
        ...waypoint,
        arrivalTimestamp,
        weather: waypointWeather
      };
    });

    return waypointsWithWeather;
  } catch (error) {
    console.error('Error adding weather to waypoints:', error);
    throw error;
  }
};

/**
 * Gets projected weather for a specific time
 * @param {Object} forecast - Weather forecast data
 * @param {Number} targetTime - Target time (Unix timestamp)
 * @returns {Object} - Projected weather data
 */
const getProjectedWeather = (forecast, targetTime) => {
  if (!forecast || !forecast.list || forecast.list.length === 0) {
    return null;
  }

  const forecastList = forecast.list;

  // If target time is in the past, return the first forecast
  if (targetTime < forecastList[0].dt) {
    return forecastList[0];
  }

  // If target time is beyond the last forecast, return the last one
  if (targetTime > forecastList[forecastList.length - 1].dt) {
    return forecastList[forecastList.length - 1];
  }

  // Find the two forecast points to interpolate between
  let beforeIndex = 0;
  for (let i = 0; i < forecastList.length - 1; i++) {
    if (forecastList[i].dt <= targetTime && forecastList[i + 1].dt >= targetTime) {
      beforeIndex = i;
      break;
    }
  }

  const before = forecastList[beforeIndex];
  const after = forecastList[beforeIndex + 1];

  // Interpolate between the two points
  return interpolateWeather(before, after, before.dt, after.dt, targetTime);
};

/**
 * Detects significant weather changes along the route
 * @param {Array} waypointsWithWeather - Waypoints with weather data
 * @returns {Array} - Array of significant weather changes
 */
const detectSignificantWeatherChanges = (waypointsWithWeather) => {
  if (!waypointsWithWeather || waypointsWithWeather.length < 2) {
    return [];
  }

  const changes = [];
  let lastWeatherCondition = waypointsWithWeather[0].weather.weather[0].main;
  let lastTemperature = waypointsWithWeather[0].weather.main.temp;

  for (let i = 1; i < waypointsWithWeather.length; i++) {
    const currentWaypoint = waypointsWithWeather[i];
    const currentWeather = currentWaypoint.weather;

    if (!currentWeather || !currentWeather.weather || currentWeather.weather.length === 0) {
      continue;
    }

    const currentCondition = currentWeather.weather[0].main;
    const currentTemperature = currentWeather.main.temp;

    // Check for significant weather condition change
    if (currentCondition !== lastWeatherCondition) {
      changes.push({
        type: 'condition',
        location: currentWaypoint.location,
        distanceFromStart: currentWaypoint.distanceFromStart,
        arrivalTimestamp: currentWaypoint.arrivalTimestamp,
        from: lastWeatherCondition,
        to: currentCondition
      });
      lastWeatherCondition = currentCondition;
    }

    // Check for significant temperature change (more than 3 degrees)
    if (Math.abs(currentTemperature - lastTemperature) > 3) {
      changes.push({
        type: 'temperature',
        location: currentWaypoint.location,
        distanceFromStart: currentWaypoint.distanceFromStart,
        arrivalTimestamp: currentWaypoint.arrivalTimestamp,
        from: lastTemperature,
        to: currentTemperature
      });
      lastTemperature = currentTemperature;
    }
  }

  return changes;
};