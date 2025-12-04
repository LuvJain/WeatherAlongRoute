/**
 * OpenWeatherMap API Service
 * Provides functions to interact with the OpenWeatherMap API
 */

// Replace with your actual OpenWeatherMap API key
const OPENWEATHER_API_KEY = 'your_openweathermap_api_key';

/**
 * Fetches current weather data for a specific location
 * @param {Object} location - The location object {lat, lng}
 * @returns {Promise} - Promise resolving to the weather data
 */
export const fetchCurrentWeather = async (location) => {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lng}&units=metric&appid=${OPENWEATHER_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.cod !== 200) {
      throw new Error(`OpenWeatherMap API error: ${data.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }
};

/**
 * Fetches forecast weather data for a specific location
 * @param {Object} location - The location object {lat, lng}
 * @returns {Promise} - Promise resolving to the forecast data
 */
export const fetchWeatherForecast = async (location) => {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lng}&units=metric&appid=${OPENWEATHER_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.cod !== "200") {
      throw new Error(`OpenWeatherMap API error: ${data.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    throw error;
  }
};

/**
 * Gets weather at a specific future time based on forecast data
 * @param {Object} forecastData - The forecast data from OpenWeatherMap
 * @param {Number} targetTime - The timestamp to get weather for
 * @returns {Object} - The weather forecast for the specified time
 */
export const getWeatherAtTime = (forecastData, targetTime) => {
  if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
    return null;
  }

  // Find the closest forecast time to the target time
  const forecastList = forecastData.list;
  let closestForecast = forecastList[0];
  let minTimeDiff = Math.abs(forecastList[0].dt - targetTime);

  for (let i = 1; i < forecastList.length; i++) {
    const timeDiff = Math.abs(forecastList[i].dt - targetTime);
    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestForecast = forecastList[i];
    }
  }

  return closestForecast;
};

/**
 * Performs linear interpolation between two weather data points
 * @param {Object} weather1 - First weather data point
 * @param {Object} weather2 - Second weather data point
 * @param {Number} time1 - Timestamp for first data point
 * @param {Number} time2 - Timestamp for second data point
 * @param {Number} targetTime - Target timestamp to interpolate for
 * @returns {Object} - Interpolated weather data
 */
export const interpolateWeather = (weather1, weather2, time1, time2, targetTime) => {
  if (!weather1 || !weather2) {
    return weather1 || weather2 || null;
  }

  // Calculate the interpolation factor (0-1)
  const factor = (targetTime - time1) / (time2 - time1);

  // Interpolate weather parameters
  const interpolated = {
    dt: targetTime,
    main: {
      temp: linearInterpolate(weather1.main.temp, weather2.main.temp, factor),
      feels_like: linearInterpolate(weather1.main.feels_like, weather2.main.feels_like, factor),
      pressure: linearInterpolate(weather1.main.pressure, weather2.main.pressure, factor),
      humidity: linearInterpolate(weather1.main.humidity, weather2.main.humidity, factor),
    },
    wind: {
      speed: linearInterpolate(weather1.wind.speed, weather2.wind.speed, factor),
      deg: interpolateWindDirection(weather1.wind.deg, weather2.wind.deg, factor),
    },
    // Use the closest point's weather condition and description
    weather: factor < 0.5 ? weather1.weather : weather2.weather,
    clouds: {
      all: linearInterpolate(weather1.clouds.all, weather2.clouds.all, factor)
    }
  };

  // Add precipitation if available in both points
  if (weather1.rain && weather2.rain) {
    interpolated.rain = {
      "3h": linearInterpolate(weather1.rain["3h"] || 0, weather2.rain["3h"] || 0, factor)
    };
  }

  if (weather1.snow && weather2.snow) {
    interpolated.snow = {
      "3h": linearInterpolate(weather1.snow["3h"] || 0, weather2.snow["3h"] || 0, factor)
    };
  }

  return interpolated;
};

/**
 * Linear interpolation between two values
 * @param {Number} a - First value
 * @param {Number} b - Second value
 * @param {Number} factor - Interpolation factor (0-1)
 * @returns {Number} - Interpolated value
 */
const linearInterpolate = (a, b, factor) => {
  return a + (b - a) * factor;
};

/**
 * Interpolates wind direction (in degrees) correctly handling the circular nature
 * @param {Number} a - First direction in degrees
 * @param {Number} b - Second direction in degrees
 * @param {Number} factor - Interpolation factor (0-1)
 * @returns {Number} - Interpolated direction
 */
const interpolateWindDirection = (a, b, factor) => {
  let diff = b - a;

  // Handle wrapping around the circle
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  let result = a + diff * factor;

  // Normalize to 0-360
  if (result < 0) result += 360;
  if (result >= 360) result -= 360;

  return result;
};