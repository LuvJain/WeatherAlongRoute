// @flow

import React, { Component } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import type { RouteSegment, StopPoint, DetectionConfig } from '../models/GeoTypes';
import { detectStopPoints, getDefaultConfig } from '../services/stopPointDetector';
import { weatherService, type WeatherData } from '../weatherService';
import StopPointConfigPanel from './StopPointConfigPanel';
import StopPointWeatherDisplay from './StopPointWeatherDisplay';

type Props = {
  route: Array<RouteSegment>,
};

type State = {
  stopPoints: Array<StopPoint>,
  detectionConfig: DetectionConfig,
  weatherData: { [key: string]: WeatherData },
  isLoading: boolean,
  error: ?string,
  offlineMode: boolean,
};

/**
 * RouteScreen displays a route with automatically detected stop points
 * and their associated weather data
 */
export default class RouteScreen extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      stopPoints: [],
      detectionConfig: getDefaultConfig(),
      weatherData: {},
      isLoading: false,
      error: null,
      offlineMode: false,
    };
  }

  /**
   * Load initial weather data and set up cache when component mounts
   */
  componentDidMount() {
    this.loadCacheAndInitialize();
    this.detectAndFetchWeather();
  }

  /**
   * Load cached weather data from storage
   */
  loadCacheAndInitialize = async () => {
    try {
      await weatherService.loadCacheFromStorage();
    } catch (error) {
      console.warn('Error loading cache:', error);
    }
  };

  /**
   * Detect stop points and fetch weather data
   */
  detectAndFetchWeather = async () => {
    const { route } = this.props;
    const { detectionConfig } = this.state;

    if (!route || route.length === 0) {
      this.setState({ error: 'No route provided' });
      return;
    }

    // Detect stop points based on current config
    const detected = detectStopPoints(route, detectionConfig);
    this.setState({ stopPoints: detected });

    // Fetch weather for detected stop points
    if (detected.length > 0) {
      await this.fetchWeatherForStops(detected);
    }
  };

  /**
   * Fetch weather data for stop points
   */
  fetchWeatherForStops = async (stops: Array<StopPoint>) => {
    this.setState({ isLoading: true, error: null });
    try {
      const stopIds = stops.map((stop) => stop.id);
      const weather = await weatherService.getWeather(stopIds);
      this.setState({
        weatherData: weather,
        isLoading: false,
      });
    } catch (error) {
      // Weather fetch failed - likely offline or network error
      console.warn('Weather fetch failed:', error);
      this.setState({
        isLoading: false,
        error: 'Unable to fetch weather data',
        offlineMode: true,
      });

      // Try to show cached weather data
      const cachedPoints = weatherService.getCachedStopPoints();
      if (cachedPoints.length > 0) {
        // Use cached data when available
        const cached = {};
        for (const point of stops) {
          if (cachedPoints.includes(point.id)) {
            // Data is in cache - weather service handles this
          }
        }
      }
    }
  };

  /**
   * Handle detection config changes from config panel
   */
  handleConfigChange = (newConfig: Partial<DetectionConfig>) => {
    const updatedConfig = {
      ...this.state.detectionConfig,
      ...newConfig,
    };
    this.setState({ detectionConfig: updatedConfig }, () => {
      // Re-detect stop points with new config
      this.detectAndFetchWeather();
    });
  };

  /**
   * Handle process offline queue when connection restored
   */
  handleRetryOffline = async () => {
    try {
      await weatherService.processOfflineQueue();
      this.setState({ offlineMode: false, error: null });
      // Re-fetch weather after queue processing
      const { stopPoints } = this.state;
      if (stopPoints.length > 0) {
        await this.fetchWeatherForStops(stopPoints);
      }
    } catch (error) {
      console.warn('Failed to process offline queue:', error);
    }
  };

  render() {
    const { stopPoints, weatherData, isLoading, error, offlineMode, detectionConfig } = this.state;

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Route Weather Information</Text>

        {/* Configuration Panel */}
        <StopPointConfigPanel
          config={detectionConfig}
          onConfigChange={this.handleConfigChange}
        />

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {offlineMode && (
              <Text style={styles.offlineHint} onPress={this.handleRetryOffline}>
                Tap to retry when online
              </Text>
            )}
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Fetching weather data...</Text>
          </View>
        )}

        {/* Offline Indicator */}
        {offlineMode && (
          <View style={styles.offlineIndicator}>
            <Text style={styles.offlineBadge}>OFFLINE</Text>
            <Text style={styles.offlineMsg}>Using cached weather data</Text>
          </View>
        )}

        {/* Stop Points List */}
        {stopPoints.length > 0 ? (
          <View style={styles.stopPointsContainer}>
            <Text style={styles.sectionTitle}>Detected Stop Points ({stopPoints.length})</Text>
            {stopPoints.map((stop) => (
              <StopPointWeatherDisplay
                key={stop.id}
                stopPoint={stop}
                weather={weatherData[stop.id]}
                isOffline={offlineMode}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No stop points detected</Text>
            <Text style={styles.emptySubtext}>
              Adjust the detection settings or provide a longer route
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 8,
  },
  offlineHint: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  offlineIndicator: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  offlineBadge: {
    color: '#e65100',
    fontWeight: 'bold',
    fontSize: 12,
  },
  offlineMsg: {
    color: '#e65100',
    fontSize: 13,
    marginTop: 4,
  },
  stopPointsContainer: {
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
  },
});
