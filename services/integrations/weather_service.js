/**
 * OpenWeatherMap API integration service
 * Provides weather data retrieval for given coordinates
 */

import config from '../config';
import httpClient from '../utils/httpClient';
import logger from '../utils/logger';

/**
 * Get current weather data for a specific location
 *
 * @param {Object} coordinates - Location coordinates {lat, lng} or {latitude, longitude}
 * @param {String} units - Units of measurement (standard, metric, imperial)
 * @returns {Promise<Object>} - Weather data
 */
const getCurrentWeather = async (coordinates, units = 'metric') => {
  try {
    // Extract lat/lng from coordinates object
    const lat = coordinates.lat || coordinates.latitude;
    const lng = coordinates.lng || coordinates.longitude;

    if (lat === undefined || lng === undefined) {
      throw new Error('Invalid coordinates provided');
    }

    logger.info('Fetching current weather', {
      coordinates: { lat, lng },
      units
    });

    // Build URL
    const url = `${config.OPEN_WEATHER_API}?lat=${lat}&lon=${lng}&units=${units}&appid=${config.OPEN_WEATHER_API_KEY}`;

    // Make API request
    const data = await httpClient.fetchWithRetry(
      url,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      },
      'OpenWeatherMap API'
    );

    // Process and return the weather data
    return processWeatherResponse(data);
  } catch (error) {
    logger.error('Error fetching weather data', error, { coordinates });
    throw error;
  }
};

/**
 * Get weather forecast for multiple points along a route
 *
 * @param {Array} routePoints - Array of coordinates for points along a route
 * @param {String} units - Units of measurement (standard, metric, imperial)
 * @returns {Promise<Array>} - Array of weather data for each point
 */
const getRouteWeather = async (routePoints, units = 'metric') => {
  try {
    logger.info('Fetching weather data for route', {
      pointCount: routePoints.length,
      units
    });

    // Fetch weather data for each point in parallel
    const weatherPromises = routePoints.map(point => getCurrentWeather(point, units));
    const weatherData = await Promise.all(weatherPromises);

    return weatherData;
  } catch (error) {
    logger.error('Error fetching route weather data', error, { pointCount: routePoints.length });
    throw error;
  }
};

/**
 * Process and transform OpenWeatherMap API response
 *
 * @param {Object} response - Raw API response
 * @returns {Object} - Processed weather data
 */
const processWeatherResponse = (response) => {
  // Check if the API returned a valid response
  if (!response || !response.weather || !response.weather[0]) {
    logger.warn('OpenWeatherMap API returned invalid response', { response });
    throw new Error('Invalid weather data received');
  }

  // Extract and transform the weather data
  return {
    location: {
      name: response.name,
      country: response.sys.country,
      coordinates: {
        lat: response.coord.lat,
        lng: response.coord.lon
      }
    },
    weather: {
      id: response.weather[0].id,
      main: response.weather[0].main,
      description: response.weather[0].description,
      icon: response.weather[0].icon,
      iconUrl: `https://openweathermap.org/img/wn/${response.weather[0].icon}@2x.png`
    },
    temperature: {
      current: response.main.temp,
      feelsLike: response.main.feels_like,
      min: response.main.temp_min,
      max: response.main.temp_max,
    },
    wind: {
      speed: response.wind.speed,
      deg: response.wind.deg
    },
    clouds: response.clouds.all, // percentage
    rain: response.rain ? response.rain['1h'] : 0, // mm in last hour
    snow: response.snow ? response.snow['1h'] : 0, // mm in last hour
    humidity: response.main.humidity, // percentage
    pressure: response.main.pressure, // hPa
    visibility: response.visibility, // meters
    timestamp: response.dt,
    sunrise: response.sys.sunrise,
    sunset: response.sys.sunset,
    timezone: response.timezone, // shift in seconds from UTC
    // Add any additional data processing here
  };
};

/**
 * Get weather icon based on the weather condition ID and day/night state
 *
 * @param {Number} weatherId - Weather condition ID from OpenWeatherMap
 * @param {Boolean} isDay - Whether it's daytime (true) or nighttime (false)
 * @returns {String} - Name of the weather icon to display
 */
const getWeatherIcon = (weatherId, isDay = true) => {
  // First digit of the weather code determines the general category
  const category = Math.floor(weatherId / 100);

  // Determine icon based on weather category and day/night
  switch (category) {
    case 2: // Thunderstorm
      return 'thunderstorm';
    case 3: // Drizzle
      return 'drizzle';
    case 5: // Rain
      if (weatherId === 500 || weatherId === 501) {
        return isDay ? 'day-rain' : 'night-rain';
      }
      return 'rain';
    case 6: // Snow
      return 'snow';
    case 7: // Atmosphere (fog, mist, etc.)
      return 'fog';
    case 8: // Clear or cloudy
      if (weatherId === 800) { // Clear sky
        return isDay ? 'day-sunny' : 'night-clear';
      }
      if (weatherId === 801 || weatherId === 802) { // Few/scattered clouds
        return isDay ? 'day-cloudy' : 'night-alt-cloudy';
      }
      return 'cloudy'; // broken or overcast clouds
    default:
      return 'day-sunny'; // Default icon
  }
};

/**
 * Get a human-readable weather summary
 *
 * @param {Object} weatherData - Processed weather data
 * @returns {String} - Weather summary
 */
const getWeatherSummary = (weatherData) => {
  const temp = Math.round(weatherData.temperature.current);
  const condition = weatherData.weather.main;
  const windSpeed = Math.round(weatherData.wind.speed);

  let summary = `${condition}, ${temp}°`;

  if (windSpeed > 10) {
    summary += ` with winds ${windSpeed} km/h`;
  }

  if (weatherData.rain > 0) {
    summary += `, rain ${weatherData.rain}mm/h`;
  }

  return summary;
};

export default {
  getCurrentWeather,
  getRouteWeather,
  getWeatherIcon,
  getWeatherSummary
};