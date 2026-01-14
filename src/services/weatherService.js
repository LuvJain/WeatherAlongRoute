/**
 * Weather Service
 * Provides methods for getting weather data along routes
 * Abstracts the underlying API implementation
 */

import { openWeatherMapService } from './api';
import { weatherLogger as logger } from '../utils/logger';
import weatherSeverityClassifier, { SEVERITY_LEVELS } from '../utils/weatherSeverity';
import warningConfig from '../config/weatherWarnings';

/**
 * Weather service for route weather information
 */
const weatherService = {
  /**
   * Get current weather at a specific location
   *
   * @param {number} latitude - The latitude coordinate
   * @param {number} longitude - The longitude coordinate
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Weather information
   */
  async getWeatherAtLocation(latitude, longitude, options = {}) {
    try {
      logger.info('Getting weather for location', { latitude, longitude });
      const weatherData = await openWeatherMapService.getWeatherByCoordinates(latitude, longitude, options);

      // Transform the weather data to a simpler format if needed
      return this._transformWeatherData(weatherData);
    } catch (error) {
      logger.error('Failed to get weather for location', error);
      throw error;
    }
  },

  /**
   * Get weather forecast at a specific location
   *
   * @param {number} latitude - The latitude coordinate
   * @param {number} longitude - The longitude coordinate
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Forecast information
   */
  async getForecastAtLocation(latitude, longitude, options = {}) {
    try {
      logger.info('Getting forecast for location', { latitude, longitude });
      const forecastData = await openWeatherMapService.getForecastByCoordinates(latitude, longitude, options);

      // Transform the forecast data if needed
      return this._transformForecastData(forecastData);
    } catch (error) {
      logger.error('Failed to get forecast for location', error);
      throw error;
    }
  },

  /**
   * Get weather data along a route
   *
   * @param {Array<{latitude: number, longitude: number}>} routePoints - Array of route points
   * @param {object} options - Additional options
   * @returns {Promise<Array<object>>} - Weather information for each point
   */
  async getWeatherAlongRoute(routePoints, options = {}) {
    if (!Array.isArray(routePoints) || routePoints.length === 0) {
      throw new Error('Invalid route points. Must provide an array of coordinate objects.');
    }

    try {
      logger.info(`Getting weather for route with ${routePoints.length} points`);

      // Convert to OpenWeatherMap API format
      const coordinates = routePoints.map(point => ({
        lat: point.latitude,
        lon: point.longitude
      }));

      const weatherDataArray = await openWeatherMapService.getWeatherForRoute(coordinates, options);

      // Transform each weather data point
      return weatherDataArray.map((data, index) => ({
        ...this._transformWeatherData(data),
        location: routePoints[index]
      }));
    } catch (error) {
      logger.error('Failed to get weather along route', error);
      throw error;
    }
  },

  /**
   * Transform raw weather data to a simpler format
   * @private
   *
   * @param {object} weatherData - Raw OpenWeatherMap API response
   * @returns {object} - Transformed weather data
   */
  _transformWeatherData(weatherData) {
    if (!weatherData) return null;

    try {
      return {
        location: {
          name: weatherData.name,
          country: weatherData.sys?.country,
          coordinates: {
            latitude: weatherData.coord?.lat,
            longitude: weatherData.coord?.lon
          }
        },
        weather: {
          condition: weatherData.weather?.[0]?.main,
          description: weatherData.weather?.[0]?.description,
          icon: weatherData.weather?.[0]?.icon,
          id: weatherData.weather?.[0]?.id
        },
        measurements: {
          temperature: weatherData.main?.temp,
          feelsLike: weatherData.main?.feels_like,
          humidity: weatherData.main?.humidity,
          pressure: weatherData.main?.pressure,
          windSpeed: weatherData.wind?.speed,
          windDirection: weatherData.wind?.deg,
          visibility: weatherData.visibility,
          cloudiness: weatherData.clouds?.all,
          rain: weatherData.rain?.['1h'] || 0,
          snow: weatherData.snow?.['1h'] || 0
        },
        timestamp: weatherData.dt * 1000, // Convert to milliseconds
        timezone: weatherData.timezone
      };
    } catch (error) {
      logger.error('Error transforming weather data', error);
      return weatherData; // Return original data on error
    }
  },

  /**
   * Transform raw forecast data to a simpler format
   * @private
   *
   * @param {object} forecastData - Raw OpenWeatherMap forecast API response
   * @returns {object} - Transformed forecast data
   */
  _transformForecastData(forecastData) {
    if (!forecastData || !forecastData.list) return null;

    try {
      return {
        location: {
          name: forecastData.city?.name,
          country: forecastData.city?.country,
          coordinates: {
            latitude: forecastData.city?.coord?.lat,
            longitude: forecastData.city?.coord?.lon
          }
        },
        forecast: forecastData.list.map(item => ({
          timestamp: item.dt * 1000,
          weather: {
            condition: item.weather?.[0]?.main,
            description: item.weather?.[0]?.description,
            icon: item.weather?.[0]?.icon,
            id: item.weather?.[0]?.id
          },
          measurements: {
            temperature: item.main?.temp,
            feelsLike: item.main?.feels_like,
            humidity: item.main?.humidity,
            pressure: item.main?.pressure,
            windSpeed: item.wind?.speed,
            windDirection: item.wind?.deg,
            cloudiness: item.clouds?.all,
            rain: item.rain?.['3h'] || 0,
            snow: item.snow?.['3h'] || 0
          }
        }))
      };
    } catch (error) {
      logger.error('Error transforming forecast data', error);
      return forecastData; // Return original data on error
    }
  },

  /**
   * Get route weather forecast with severity classifications
   *
   * @param {Array<{latitude: number, longitude: number, distance?: number}>} routePoints - Array of route points
   * @param {object} options - Additional options
   * @param {number} [options.segmentLength=25] - Approximate length of each route segment in km
   * @param {boolean} [options.includeSeverity=true] - Whether to include severity classification
   * @param {string} [options.units='metric'] - Units system ('metric' or 'imperial')
   * @returns {Promise<object>} - Route weather forecast with segments
   */
  async getRouteWeatherForecast(routePoints, options = {}) {
    if (!Array.isArray(routePoints) || routePoints.length < 2) {
      throw new Error('Invalid route points. Must provide at least start and end coordinates.');
    }

    const {
      segmentLength = 25, // km
      includeSeverity = true,
      units = 'metric'
    } = options;

    try {
      logger.info(`Getting weather forecast for route with ${routePoints.length} points`);

      // Ensure warning thresholds use the right units
      if (warningConfig.activeThresholds.temperature.units === 'celsius' && units === 'imperial') {
        warningConfig.convertUnits('imperial');
      } else if (warningConfig.activeThresholds.temperature.units === 'fahrenheit' && units === 'metric') {
        warningConfig.convertUnits('metric');
      }

      // 1. Get raw weather data for all points
      const weatherDataArray = await this.getWeatherAlongRoute(routePoints, { ...options, units });

      // 2. Calculate route segments based on waypoints and segmentLength
      const routeSegments = this._calculateRouteSegments(routePoints, segmentLength);

      // 3. Assign weather data to segments and classify severity
      const segmentsWithWeather = this._assignWeatherToSegments(routeSegments, weatherDataArray, includeSeverity);

      // 4. Identify segments with significant weather conditions and create warnings
      const warnings = this._generateRouteWarnings(segmentsWithWeather);

      // 5. Construct the final route weather forecast
      return {
        routeOverview: {
          startPoint: routePoints[0],
          endPoint: routePoints[routePoints.length - 1],
          waypoints: routePoints.length - 2, // Exclude start and end
          totalSegments: segmentsWithWeather.length,
          units: units,
          highestSeverity: this._getHighestSeverityInRoute(segmentsWithWeather),
        },
        segments: segmentsWithWeather,
        warnings: warnings.length > 0 ? warnings : [{
          severity: SEVERITY_LEVELS.NONE,
          message: 'No significant weather conditions along route'
        }]
      };
    } catch (error) {
      logger.error('Failed to get route weather forecast', error);
      throw new Error(`Error getting route weather forecast: ${error.message}`);
    }
  },

  /**
   * Calculate route segments based on waypoints and desired segment length
   * @private
   *
   * @param {Array<{latitude: number, longitude: number, distance?: number}>} routePoints - Array of route points
   * @param {number} segmentLength - Desired segment length in km
   * @returns {Array<object>} - Route segments
   */
  _calculateRouteSegments(routePoints, segmentLength) {
    const segments = [];

    // Create segments from the route points
    for (let i = 0; i < routePoints.length - 1; i++) {
      const startPoint = routePoints[i];
      const endPoint = routePoints[i + 1];

      // Calculate the rough distance between points if not provided
      // This is a simple approximation using the Haversine formula
      const pointDistance = startPoint.distance || this._calculateDistance(
        startPoint.latitude, startPoint.longitude,
        endPoint.latitude, endPoint.longitude
      );

      // If the distance between waypoints is longer than segmentLength,
      // break it into multiple segments
      if (pointDistance > segmentLength * 1.5) {
        const numSegments = Math.ceil(pointDistance / segmentLength);

        for (let j = 0; j < numSegments; j++) {
          const segmentStartFraction = j / numSegments;
          const segmentEndFraction = (j + 1) / numSegments;

          const segmentStart = this._interpolatePoint(startPoint, endPoint, segmentStartFraction);
          const segmentEnd = this._interpolatePoint(startPoint, endPoint, segmentEndFraction);

          segments.push({
            startPoint: segmentStart,
            endPoint: segmentEnd,
            distance: pointDistance / numSegments,
            waypointIndex: i
          });
        }
      } else {
        // Otherwise, use the waypoint as a single segment
        segments.push({
          startPoint,
          endPoint,
          distance: pointDistance,
          waypointIndex: i
        });
      }
    }

    return segments;
  },

  /**
   * Assign weather data to route segments
   * @private
   *
   * @param {Array<object>} segments - Route segments
   * @param {Array<object>} weatherDataArray - Weather data for route points
   * @param {boolean} includeSeverity - Whether to include severity classification
   * @returns {Array<object>} - Segments with weather data
   */
  _assignWeatherToSegments(segments, weatherDataArray, includeSeverity) {
    return segments.map(segment => {
      // Find the weather data point closest to the midpoint of this segment
      const midpoint = this._interpolatePoint(segment.startPoint, segment.endPoint, 0.5);

      let closestWeatherData = null;
      let minDistance = Infinity;

      // Find the closest weather data point to this segment
      for (const weatherData of weatherDataArray) {
        const distance = this._calculateDistance(
          midpoint.latitude, midpoint.longitude,
          weatherData.location.coordinates.latitude,
          weatherData.location.coordinates.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestWeatherData = weatherData;
        }
      }

      // If no weather data is available, create a placeholder
      if (!closestWeatherData) {
        return {
          ...segment,
          weather: null,
          weatherAvailable: false,
          severity: SEVERITY_LEVELS.NONE
        };
      }

      // Add severity classification if requested
      let severityInfo = { level: SEVERITY_LEVELS.NONE, warnings: [] };
      if (includeSeverity && closestWeatherData) {
        severityInfo = weatherSeverityClassifier.getSeverity(closestWeatherData);
      }

      return {
        ...segment,
        weather: closestWeatherData,
        weatherAvailable: true,
        severity: severityInfo.level,
        severityDetails: severityInfo.warnings,
        weatherConfidence: minDistance < 10 ? 'high' : minDistance < 25 ? 'medium' : 'low'
      };
    });
  },

  /**
   * Generate route warnings based on segment weather data
   * @private
   *
   * @param {Array<object>} segmentsWithWeather - Segments with weather data
   * @returns {Array<object>} - Weather warnings for route
   */
  _generateRouteWarnings(segmentsWithWeather) {
    const warnings = [];
    const minSegmentDistance = warningConfig.getThresholds().routeSegments.minSegmentDistance;
    let currentWarningSegment = null;

    for (let i = 0; i < segmentsWithWeather.length; i++) {
      const segment = segmentsWithWeather[i];

      // Skip segments without weather data or with low severity
      if (!segment.weatherAvailable || segment.severity === SEVERITY_LEVELS.NONE || segment.severity === SEVERITY_LEVELS.LOW) {
        // If we were tracking a warning segment, finalize it
        if (currentWarningSegment) {
          warnings.push(this._finalizeWarningSegment(currentWarningSegment));
          currentWarningSegment = null;
        }
        continue;
      }

      // Check if this is a continuation of the current warning
      if (currentWarningSegment &&
          currentWarningSegment.severity === segment.severity &&
          currentWarningSegment.type === segment.severityDetails[0]?.type) {

        // Extend the current warning
        currentWarningSegment.segments.push(i);
        currentWarningSegment.endPoint = segment.endPoint;
        currentWarningSegment.distance += segment.distance;

      } else {
        // If we were tracking a warning segment, finalize it
        if (currentWarningSegment) {
          warnings.push(this._finalizeWarningSegment(currentWarningSegment));
        }

        // Start a new warning segment if severity is significant
        if (segment.severity !== SEVERITY_LEVELS.NONE && segment.severity !== SEVERITY_LEVELS.LOW) {
          currentWarningSegment = {
            severity: segment.severity,
            type: segment.severityDetails[0]?.type || 'weather', // Use the primary warning type
            segments: [i],
            startPoint: segment.startPoint,
            endPoint: segment.endPoint,
            distance: segment.distance,
            details: segment.severityDetails
          };
        }
      }
    }

    // Finalize any remaining warning segment
    if (currentWarningSegment) {
      warnings.push(this._finalizeWarningSegment(currentWarningSegment));
    }

    return warnings;
  },

  /**
   * Finalize a warning segment and create the warning message
   * @private
   *
   * @param {object} warningSegment - Warning segment data
   * @returns {object} - Finalized warning
   */
  _finalizeWarningSegment(warningSegment) {
    // Create a human-readable warning message
    let message = '';

    // Add severity and type
    const severityText = warningSegment.severity.charAt(0).toUpperCase() + warningSegment.severity.slice(1);

    if (warningSegment.type === 'condition') {
      const conditionDetail = warningSegment.details.find(d => d.type === 'condition');
      message = `${severityText} ${conditionDetail?.message || 'weather conditions'}`;
    } else if (warningSegment.type === 'temperature') {
      const tempDetail = warningSegment.details.find(d => d.type === 'temperature');
      message = `${severityText} ${tempDetail?.message || 'temperature conditions'}`;
    } else if (warningSegment.type === 'wind') {
      const windDetail = warningSegment.details.find(d => d.type === 'wind');
      message = `${severityText} ${windDetail?.message || 'wind conditions'}`;
    } else if (warningSegment.type === 'rain' || warningSegment.type === 'snow') {
      const precipDetail = warningSegment.details.find(d => d.type === warningSegment.type);
      message = `${severityText} ${precipDetail?.message || 'precipitation'}`;
    } else if (warningSegment.type === 'visibility') {
      const visDetail = warningSegment.details.find(d => d.type === 'visibility');
      message = `${severityText} ${visDetail?.message || 'visibility conditions'}`;
    } else {
      message = `${severityText} weather conditions`;
    }

    // Add distance information
    const distanceRounded = Math.round(warningSegment.distance * 10) / 10;
    message += ` for approximately ${distanceRounded} km`;

    return {
      severity: warningSegment.severity,
      type: warningSegment.type,
      message: message,
      segments: warningSegment.segments,
      details: warningSegment.details,
      color: weatherSeverityClassifier.getSeverityColor(warningSegment.severity),
      description: weatherSeverityClassifier.getSeverityDescription(warningSegment.severity),
      distance: warningSegment.distance,
      startPoint: warningSegment.startPoint,
      endPoint: warningSegment.endPoint
    };
  },

  /**
   * Find the highest severity level in the route
   * @private
   *
   * @param {Array<object>} segments - Route segments with weather data
   * @returns {string} - Highest severity level
   */
  _getHighestSeverityInRoute(segments) {
    let highestSeverity = SEVERITY_LEVELS.NONE;

    for (const segment of segments) {
      if (segment.weatherAvailable) {
        // Compare severity levels
        const segmentSeverityRank = this._getSeverityRank(segment.severity);
        const currentHighestRank = this._getSeverityRank(highestSeverity);

        if (segmentSeverityRank > currentHighestRank) {
          highestSeverity = segment.severity;
        }
      }
    }

    return highestSeverity;
  },

  /**
   * Get numerical rank of a severity level for comparison
   * @private
   *
   * @param {string} severity - Severity level
   * @returns {number} - Severity rank
   */
  _getSeverityRank(severity) {
    const ranks = {
      [SEVERITY_LEVELS.NONE]: 0,
      [SEVERITY_LEVELS.LOW]: 1,
      [SEVERITY_LEVELS.MODERATE]: 2,
      [SEVERITY_LEVELS.HIGH]: 3,
      [SEVERITY_LEVELS.EXTREME]: 4
    };

    return ranks[severity] || 0;
  },

  /**
   * Interpolate between two points
   * @private
   *
   * @param {object} point1 - First point {latitude, longitude}
   * @param {object} point2 - Second point {latitude, longitude}
   * @param {number} fraction - Fraction of distance (0-1)
   * @returns {object} - Interpolated point
   */
  _interpolatePoint(point1, point2, fraction) {
    return {
      latitude: point1.latitude + (point2.latitude - point1.latitude) * fraction,
      longitude: point1.longitude + (point2.longitude - point1.longitude) * fraction
    };
  },

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @private
   *
   * @param {number} lat1 - First point latitude
   * @param {number} lon1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lon2 - Second point longitude
   * @returns {number} - Distance in kilometers
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Convert degrees to radians
   * @private
   *
   * @param {number} deg - Degrees
   * @returns {number} - Radians
   */
  _toRad(deg) {
    return deg * (Math.PI / 180);
  }
};

export default weatherService;