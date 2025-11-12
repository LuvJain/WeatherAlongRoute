/**
 * API Configuration File
 * Contains configuration for external API services
 */

// OpenWeatherMap API configuration
export const OPEN_WEATHER_MAP_CONFIG = {
  // API key for OpenWeatherMap API
  // Replace this with your actual API key from OpenWeatherMap
  API_KEY: 'YOUR_OPENWEATHERMAP_API_KEY',

  // Base URLs for different OpenWeatherMap API endpoints
  BASE_URL: 'https://api.openweathermap.org/data/2.5',

  // Endpoints
  ENDPOINTS: {
    CURRENT_WEATHER: '/weather',
    FORECAST: '/forecast',
  },

  // Default parameters for API requests
  DEFAULT_PARAMS: {
    units: 'metric', // Use metric units by default (Celsius)
    lang: 'en', // English language
  },

  // Rate limiting settings
  RATE_LIMIT: {
    MAX_REQUESTS_PER_DAY: 1000, // Free tier limit (example)
    COOLDOWN_PERIOD: 60 * 1000, // 1 minute in milliseconds for request throttling
  },

  // Cache settings
  CACHE: {
    CURRENT_WEATHER_TTL: 30 * 60 * 1000, // 30 minutes in milliseconds
    FORECAST_TTL: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  }
};

/**
 * Environment-specific configuration
 * In a real application, you would likely use environment variables for this
 */
export const ENV = {
  IS_DEVELOPMENT: __DEV__, // React Native's built-in development flag
  ENABLE_API_LOGS: __DEV__, // Only log API requests in development
};

export default {
  OPEN_WEATHER_MAP_CONFIG,
  ENV
};