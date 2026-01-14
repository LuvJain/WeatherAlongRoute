/**
 * API Configuration
 * Stores API keys and endpoints for external services
 */

const apiConfig = {
  // OpenWeatherMap API configuration
  openWeatherMap: {
    apiKey: 'YOUR_OPENWEATHERMAP_API_KEY', // Replace with your actual API key
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    endpoints: {
      weather: '/weather',
      forecast: '/forecast',
      onecall: '/onecall',
    },
    defaultParams: {
      units: 'metric', // metric (Celsius) or imperial (Fahrenheit)
      lang: 'en',
    },
  },

  // Google Places API (already in use in the app)
  googlePlaces: {
    apiKey: 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA', // Using existing key from App.js
    // Add any additional config needed
  },

  // Caching configuration
  cache: {
    weatherDataTTL: 10 * 60 * 1000, // Time-to-live for cached weather data (10 minutes in ms)
  },
};

export default apiConfig;