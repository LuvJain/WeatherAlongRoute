# Weather Along RizRoute - Setup Guide

This guide will help you set up the OpenWeatherMap API integration for the Weather Along RizRoute application.

## Prerequisites

- Node.js (v12+)
- npm or yarn
- React Native development environment
- OpenWeatherMap API key (see below)

## Getting an OpenWeatherMap API Key

1. Visit [OpenWeatherMap's website](https://openweathermap.org/)
2. Sign up for a free account
3. After logging in, go to your API keys section
4. Generate a new API key (free tier is sufficient for development)
5. Note: New API keys may take a few hours to become active

## Installation Steps

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd weather-along-rizroute
   ```

2. Install dependencies:
   ```bash
   npm install
   # OR
   yarn install
   ```

3. Configure your OpenWeatherMap API key:
   - Open `src/config/api.js`
   - Replace the placeholder value for `API_KEY` with your actual API key:
     ```javascript
     API_KEY: 'YOUR_OPENWEATHERMAP_API_KEY',
     ```

4. (Optional) Configure API settings:
   - You can modify various settings in `src/config/api.js`:
     - Units (metric/imperial)
     - Language
     - Cache expiration times
     - Rate limiting parameters

5. Run the application:
   ```bash
   npm start
   # Then in a separate terminal:
   npm run android
   # OR
   npm run ios
   ```

## Using the Weather Features

1. Enter a starting location using the location search field
2. (Optional) Enter a destination location
3. Click "Show Weather" to display weather information
4. Switch between weather for the starting point and destination
5. Toggle between current weather and 5-day forecast

## API Usage Notes

The application implements several features to optimize OpenWeatherMap API usage:

1. **Client-side caching:**
   - Current weather data is cached for 30 minutes
   - Forecast data is cached for 2 hours
   - Cache persists across app restarts

2. **Rate limiting:**
   - Prevents exceeding API rate limits
   - Implements cooldown periods between requests
   - Queues requests when needed

3. **Error handling:**
   - Gracefully handles API errors
   - Falls back to cached data when API is unavailable
   - Provides user-friendly error messages

## Troubleshooting

1. **Weather data not loading:**
   - Verify your API key is correctly set in `src/config/api.js`
   - Check your internet connection
   - New API keys may take up to 2 hours to activate

2. **Location search not working:**
   - Ensure Google Places API is properly configured
   - Check if the device has internet connectivity

3. **Cached data issues:**
   - To clear all cached weather data, use the following in your code:
     ```javascript
     import WeatherDataManager from './src/services/WeatherDataManager';

     // Clear all cached weather data
     WeatherDataManager.clearCache();
     ```

## Development Notes

- Modify API polling frequency in `src/config/api.js`
- Adjust cache TTL values based on your needs
- The `WeatherDisplay` component can be reused in other parts of your application

## API Documentation

- [OpenWeatherMap API Documentation](https://openweathermap.org/api)
- [Current Weather Data API](https://openweathermap.org/current)
- [5-day Forecast API](https://openweathermap.org/forecast5)