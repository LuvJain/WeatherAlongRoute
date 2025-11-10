/**
 * Weather Service
 * Provides methods for getting weather data along routes
 * Abstracts the underlying API implementation
 */

import { openWeatherMapService } from './api';
import { weatherLogger as logger } from '../utils/logger';

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
  }
};

export default weatherService;