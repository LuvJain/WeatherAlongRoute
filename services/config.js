/**
 * Configuration file for API keys and settings
 * In production, these values should be loaded from environment variables
 * or a secure storage solution like react-native-config
 */

const config = {
  // API Keys
  GOOGLE_MAPS_API_KEY: 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA', // Use environment variables in production
  OPEN_WEATHER_API_KEY: 'YOUR_OPEN_WEATHER_API_KEY', // Replace with your actual API key

  // API Endpoints
  GOOGLE_MAPS_DIRECTIONS_API: 'https://maps.googleapis.com/maps/api/directions/json',
  OPEN_WEATHER_API: 'https://api.openweathermap.org/data/2.5/weather',

  // Request settings
  TIMEOUT: 10000, // 10 seconds timeout
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000, // 1 second between retries
};

export default config;