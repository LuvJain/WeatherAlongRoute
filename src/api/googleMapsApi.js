/**
 * Google Maps API Service
 * Provides functions to interact with the Google Maps API
 */

const GOOGLE_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA'; // Use the key from App.js

/**
 * Fetches route data between two locations using Google Maps Directions API
 * @param {Object} startLocation - The starting location object {lat, lng}
 * @param {Object} endLocation - The destination location object {lat, lng}
 * @param {Array} waypoints - Optional waypoints to include in the route
 * @returns {Promise} - Promise resolving to the route data
 */
export const fetchRouteData = async (startLocation, endLocation, waypoints = []) => {
  try {
    // Build waypoints string if any waypoints are provided
    let waypointsStr = '';
    if (waypoints.length > 0) {
      waypointsStr = '&waypoints=' + waypoints.map(wp =>
        `${wp.location.lat},${wp.location.lng}`
      ).join('|');
    }

    // Build the API URL
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLocation.lat},${startLocation.lng}&destination=${endLocation.lat},${endLocation.lng}${waypointsStr}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Directions API error: ${data.status}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching route data:', error);
    throw error;
  }
};

/**
 * Extracts waypoints from a Google Maps Directions API response
 * @param {Object} routeData - The route data from Google Maps API
 * @param {Number} density - Optional parameter to control waypoint density
 *                          (1 = all points, 2 = every other point, etc.)
 * @returns {Array} - Array of waypoints with coordinates and estimated time
 */
export const extractRouteWaypoints = (routeData, density = 1) => {
  if (!routeData || !routeData.routes || routeData.routes.length === 0) {
    return [];
  }

  const route = routeData.routes[0];
  const legs = route.legs;

  const waypoints = [];
  let totalDuration = 0;
  let totalDistance = 0;

  // Process each leg of the route
  legs.forEach(leg => {
    // Calculate cumulative duration and distance
    let legDuration = 0;
    let legDistance = 0;

    // Process each step in the leg
    leg.steps.forEach(step => {
      // Add start point of the step
      legDuration += step.duration.value;
      legDistance += step.distance.value;

      // For performance optimization, reduce waypoint density for longer routes
      if (totalDistance % density === 0) {
        waypoints.push({
          location: {
            lat: step.start_location.lat,
            lng: step.start_location.lng
          },
          arrivalTime: totalDuration + legDuration,
          distanceFromStart: totalDistance + legDistance
        });
      }

      // Process polyline points for more granular waypoints
      if (step.polyline && step.polyline.points) {
        const decodedPath = decodePolyline(step.polyline.points);

        // Skip first and last points to avoid duplication
        const innerPoints = decodedPath.slice(1, -1);

        // Calculate time and distance ratio for interpolation
        const timeRatio = step.duration.value / innerPoints.length;
        const distanceRatio = step.distance.value / innerPoints.length;

        // Add intermediate points based on density
        innerPoints.forEach((point, index) => {
          if (index % density === 0) {
            const pointDuration = legDuration + (index + 1) * timeRatio;
            const pointDistance = legDistance + (index + 1) * distanceRatio;

            waypoints.push({
              location: {
                lat: point.lat,
                lng: point.lng
              },
              arrivalTime: totalDuration + pointDuration,
              distanceFromStart: totalDistance + pointDistance
            });
          }
        });
      }
    });

    // Add the end location of the leg
    waypoints.push({
      location: {
        lat: leg.end_location.lat,
        lng: leg.end_location.lng
      },
      arrivalTime: totalDuration + leg.duration.value,
      distanceFromStart: totalDistance + leg.distance.value
    });

    totalDuration += leg.duration.value;
    totalDistance += leg.distance.value;
  });

  return waypoints;
};

/**
 * Decodes a polyline string into an array of coordinates
 * Based on Google's polyline algorithm
 * @param {String} encoded - The encoded polyline string
 * @returns {Array} - Array of {lat, lng} coordinates
 */
const decodePolyline = (encoded) => {
  const points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      lat: lat * 1e-5,
      lng: lng * 1e-5
    });
  }

  return points;
};

/**
 * Optimizes waypoint extraction for long routes (over 500km)
 * @param {Object} routeData - The route data from Google Maps API
 * @returns {Array} - Optimized array of waypoints
 */
export const getOptimizedWaypoints = (routeData) => {
  // Check if we need to optimize (route > 500km)
  let totalDistance = 0;

  if (routeData && routeData.routes && routeData.routes.length > 0) {
    const route = routeData.routes[0];
    route.legs.forEach(leg => {
      totalDistance += leg.distance.value;
    });
  }

  // For routes over 500km, reduce waypoint density
  if (totalDistance > 500000) { // 500km in meters
    // Adaptive density based on distance
    const density = Math.ceil(totalDistance / 500000); // 1 point per X points where X scales with distance
    return extractRouteWaypoints(routeData, density);
  }

  // For shorter routes, use all waypoints
  return extractRouteWaypoints(routeData, 1);
};