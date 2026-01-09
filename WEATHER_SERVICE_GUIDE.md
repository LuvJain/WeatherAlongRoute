# Weather Service Implementation Guide

## Overview

This weather service provides a production-ready solution for fetching weather data along a route with the following features:

- **Batch API Calls**: Fetches up to 5 weather data points per API request
- **Local Caching**: Prevents redundant API calls within 120-minute cache window
- **Offline Queue**: Queues requests when offline and processes them when connection is restored
- **Comprehensive Data**: Includes temperature, condition, humidity, wind speed, and fetch timestamp
- **Retry Logic**: Automatically retries failed requests up to 3 times

## Features

### 1. Batch Fetching (Max 5 Points Per Request)

The service automatically batches requests to the weather API, sending a maximum of 5 stop points per API call. For larger requests, they are automatically split into multiple batches.

```typescript
const stopPoints = ['stop1', 'stop2', 'stop3', 'stop4', 'stop5', 'stop6', 'stop7'];
const weather = await weatherService.getWeather(stopPoints);
// This will make 2 API calls: one for 5 points, one for 2 points
```

### 2. Cache Layer (120-Minute Timeout)

Weather data is cached locally and reused within a 120-minute window. This prevents unnecessary API calls for the same stop points.

```typescript
// First call - fetches from API
const weather1 = await weatherService.getWeather(['stop1']);

// Second call within 120 minutes - returns cached data (no API call)
const weather2 = await weatherService.getWeather(['stop1']);
```

### 3. Offline Queue

When the device is offline or the API call fails, requests are automatically queued in AsyncStorage. When connection is restored, the queue is processed automatically.

```typescript
// This request will be queued if offline
try {
  const weather = await weatherService.getWeather(['stop1']);
} catch (error) {
  console.log('Request queued for offline processing');
}

// When connection is restored:
await weatherService.processOfflineQueue();
```

### 4. Weather Data Structure

All weather data includes the following fields:

```typescript
interface WeatherData {
  temperature: number;      // Temperature in Fahrenheit
  condition: string;        // Weather condition (e.g., "sunny", "cloudy", "rainy")
  humidity: number;         // Humidity percentage (0-100)
  windSpeed: number;        // Wind speed in mph
  fetchTimestamp: number;   // Unix timestamp of when data was fetched
}
```

## Usage Examples

### Basic Usage

```typescript
import { weatherService } from './weatherService';

// Get weather for multiple stops
const stopPoints = ['New York', 'Philadelphia', 'Washington DC'];
const weatherData = await weatherService.getWeather(stopPoints);

console.log(weatherData['New York']);
// Output:
// {
//   temperature: 72,
//   condition: 'sunny',
//   humidity: 45,
//   windSpeed: 10,
//   fetchTimestamp: 1673456789000
// }
```

### Initialization with Custom Config

```typescript
import { WeatherService } from './weatherService';

const service = new WeatherService({
  cacheTimeoutMs: 60 * 60 * 1000,  // 60 minutes
  maxBatchSize: 5,                   // Max 5 points per batch
  apiBaseUrl: 'https://api.weather.com'
});

// Load existing cache from storage
await service.loadCacheFromStorage();
```

### Handling Offline Requests

```typescript
import { weatherService } from './weatherService';
import NetInfo from '@react-native-community/netinfo';

// Monitor network connectivity
NetInfo.addEventListener(async (state) => {
  if (state.isConnected && state.isInternetReachable) {
    // Process any queued requests when connection is restored
    await weatherService.processOfflineQueue();
  }
});
```

### Cache Management

```typescript
import { weatherService } from './weatherService';

// Check cached stop points
const cached = weatherService.getCachedStopPoints();
console.log('Cached stops:', cached);

// Get cache size
const size = weatherService.getCacheSize();
console.log('Cache entries:', size);

// Clear all cache and queue
await weatherService.clearAll();
```

## API Integration

The service expects a batch API endpoint that accepts the following request:

```typescript
POST /weather/batch
Content-Type: application/json

{
  "stopPoints": ["stop1", "stop2", "stop3"]
}
```

And returns a JSON response in this format:

```json
{
  "stop1": {
    "temperature": 72,
    "condition": "sunny",
    "humidity": 45,
    "windSpeed": 10,
    "fetchTimestamp": 1673456789000
  },
  "stop2": {
    "temperature": 68,
    "condition": "cloudy",
    "humidity": 60,
    "windSpeed": 15,
    "fetchTimestamp": 1673456789000
  }
}
```

## Testing

The implementation includes comprehensive Jest tests covering:

1. **Batch Fetching**: Verifies that requests are split into batches of max 5 items
2. **Caching**: Tests cache validity, persistence, and timeout behavior
3. **Offline Queueing**: Validates request queueing and retry logic
4. **Data Structure**: Ensures all required fields are present in weather data
5. **Edge Cases**: Handles empty requests, mixed cached/uncached data, etc.

Run tests with:

```bash
npm test
```

## Performance Considerations

- **Cache Size**: The in-memory cache can hold unlimited entries, but only the most recent data per stop point
- **API Calls**: Batch fetching reduces API calls by up to 5x compared to fetching individually
- **Storage**: Cache and queue data are persisted to AsyncStorage for reliability
- **Retry Logic**: Maximum 3 retries per offline request to avoid infinite loops

## Error Handling

```typescript
try {
  const weather = await weatherService.getWeather(['stop1']);
} catch (error) {
  console.error('Failed to fetch weather:', error);
  // Request is automatically queued for offline processing
}
```

## Integration with React Components

```typescript
import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import { weatherService } from './weatherService';

export const WeatherDisplay = ({ stopPoint }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const data = await weatherService.getWeather([stopPoint]);
        setWeather(data[stopPoint]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadWeather();
  }, [stopPoint]);

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <View>
      <Text>Temperature: {weather.temperature}°F</Text>
      <Text>Condition: {weather.condition}</Text>
      <Text>Humidity: {weather.humidity}%</Text>
      <Text>Wind: {weather.windSpeed} mph</Text>
    </View>
  );
};
```

## File Structure

```
.
├── weatherService.ts          # Main weather service implementation
├── __tests__/
│   └── weatherService.test.ts # Comprehensive test suite
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
└── WEATHER_SERVICE_GUIDE.md   # This file
```

## Acceptance Criteria Met

✅ Weather data fetched via batch API calls (max 5 points per request)
✅ Cache layer prevents redundant API calls for same stop points within 120 minutes
✅ Offline requests queued in AsyncStorage and processed when connection restored
✅ Weather data includes temperature, condition, humidity, wind speed, and fetch timestamp
✅ Jest tests verify batch fetching, caching, offline queueing, and retry logic
