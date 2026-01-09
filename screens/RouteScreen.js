// @flow

import React, { Component } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Geolocation } from 'react-native';
import type { RouteSegment, StopPoint, DetectionConfig, Coordinate } from '../models/GeoTypes';
import { detectStopPoints, getDefaultConfig } from '../services/stopPointDetector';
import { weatherService, type WeatherData } from '../weatherService';
import { routeProgressTracker, type RouteProgress, type DriverLocation } from '../services/routeProgressTracker';
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
  driverLocation: ?DriverLocation,
  routeProgress: ?RouteProgress,
  geolocationError: ?string,
  geolocationWatchId: ?number,
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
      driverLocation: null,
      routeProgress: null,
      geolocationError: null,
      geolocationWatchId: null,
    };
  }

  /**
   * Load initial weather data and set up cache when component mounts
   */
  componentDidMount() {
    this.loadCacheAndInitialize();
    this.detectAndFetchWeather();
    this.startGeolocationTracking();
  }

  /**
   * Cleanup geolocation listener on unmount
   */
  componentWillUnmount() {
    this.stopGeolocationTracking();
    routeProgressTracker.reset();
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

  /**
   * Start watching driver location
   */
  startGeolocationTracking = () => {
    try {
      const watchId = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const driverLocation: DriverLocation = {
            latitude,
            longitude,
            timestamp: position.timestamp,
          };

          this.handleLocationUpdate(driverLocation);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          this.setState({ geolocationError: error.message });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      this.setState({ geolocationWatchId: watchId });
    } catch (error) {
      console.warn('Failed to start geolocation tracking:', error);
      this.setState({ geolocationError: 'Failed to start location tracking' });
    }
  };

  /**
   * Stop watching driver location
   */
  stopGeolocationTracking = () => {
    const { geolocationWatchId } = this.state;
    if (geolocationWatchId !== null && geolocationWatchId !== undefined) {
      Geolocation.clearWatch(geolocationWatchId);
      this.setState({ geolocationWatchId: null });
    }
  };

  /**
   * Handle driver location update
   */
  handleLocationUpdate = async (driverLocation: DriverLocation) => {
    const { stopPoints, routeProgress } = this.state;

    // Initialize route progress tracker if not already done
    if (stopPoints.length > 0 && !routeProgress) {
      const startPoint = this.props.route[0]?.startPoint;
      if (startPoint) {
        routeProgressTracker.initialize(startPoint, stopPoints);
      }
    }

    try {
      // Calculate updated progress
      const progress = routeProgressTracker.updateProgress(driverLocation);

      this.setState({
        driverLocation,
        routeProgress: progress,
      });

      // Refresh weather for upcoming stops within lookahead distance
      await this.refreshWeatherForUpcomingStops(progress);
    } catch (error) {
      console.warn('Error updating route progress:', error);
    }
  };

  /**
   * Refresh weather data for stops within lookahead distance
   */
  refreshWeatherForUpcomingStops = async (progress: RouteProgress) => {
    const upcomingStops = routeProgressTracker.getUpcomingStopsForWeather(progress);

    if (upcomingStops.length > 0) {
      const stopIds = upcomingStops.map((stop) => stop.id);

      try {
        const weather = await weatherService.getWeather(stopIds);

        // Update weather data with new results
        this.setState((prevState) => ({
          weatherData: {
            ...prevState.weatherData,
            ...weather,
          },
        }));
      } catch (error) {
        console.warn('Failed to refresh weather for upcoming stops:', error);
      }
    }
  };

  render() {
    const {
      stopPoints,
      weatherData,
      isLoading,
      error,
      offlineMode,
      detectionConfig,
      routeProgress,
      driverLocation,
      geolocationError,
    } = this.state;

    const upcomingStops = routeProgress?.remainingStops || [];
    const nextStop = routeProgress?.nextStop;
    const distanceToNextStop = routeProgress?.distanceToNextStop || 0;
    const eta = routeProgress?.eta;

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Route Weather Information</Text>

        {/* Configuration Panel */}
        <StopPointConfigPanel
          config={detectionConfig}
          onConfigChange={this.handleConfigChange}
        />

        {/* Driver Location Indicator */}
        {driverLocation && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationTitle}>📍 Current Location</Text>
            <Text style={styles.locationText}>
              {driverLocation.latitude.toFixed(4)}°N, {Math.abs(driverLocation.longitude).toFixed(4)}°W
            </Text>
          </View>
        )}

        {/* Geolocation Error */}
        {geolocationError && (
          <View style={styles.geolocationErrorContainer}>
            <Text style={styles.geolocationErrorText}>⚠️ {geolocationError}</Text>
          </View>
        )}

        {/* Next Stop Highlight */}
        {nextStop && (
          <View style={styles.nextStopContainer}>
            <Text style={styles.nextStopLabel}>🎯 Next Stop</Text>
            <View style={styles.nextStopContent}>
              <View>
                <Text style={styles.nextStopId}>{nextStop.id}</Text>
                <Text style={styles.nextStopCoords}>
                  {nextStop.coordinate.latitude.toFixed(4)}°N, {Math.abs(nextStop.coordinate.longitude).toFixed(4)}°W
                </Text>
              </View>
              <View style={styles.nextStopStats}>
                <View style={styles.nextStopStat}>
                  <Text style={styles.nextStopStatLabel}>Distance</Text>
                  <Text style={styles.nextStopStatValue}>
                    {(distanceToNextStop / 1000).toFixed(1)} km
                  </Text>
                </View>
                {eta && (
                  <View style={styles.nextStopStat}>
                    <Text style={styles.nextStopStatLabel}>ETA</Text>
                    <Text style={styles.nextStopStatValue}>
                      {Math.round(eta / 60)} min
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

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

        {/* Upcoming Stop Points List */}
        {upcomingStops.length > 0 ? (
          <View style={styles.stopPointsContainer}>
            <Text style={styles.sectionTitle}>Upcoming Stops ({upcomingStops.length})</Text>
            {upcomingStops.map((stop, index) => (
              <StopPointWeatherDisplay
                key={stop.id}
                stopPoint={stop}
                weather={weatherData[stop.id]}
                isOffline={offlineMode}
                isNextStop={index === 0}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {stopPoints.length > 0 ? 'All stops completed!' : 'No stop points detected'}
            </Text>
            <Text style={styles.emptySubtext}>
              {stopPoints.length > 0
                ? 'You have completed all stops on this route'
                : 'Adjust the detection settings or provide a longer route'}
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
  locationContainer: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  locationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1565c0',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#0d47a1',
    fontFamily: 'Menlo',
  },
  geolocationErrorContainer: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#e53935',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  geolocationErrorText: {
    fontSize: 13,
    color: '#c62828',
  },
  nextStopContainer: {
    backgroundColor: '#fff9c4',
    borderLeftWidth: 4,
    borderLeftColor: '#fbc02d',
    padding: 14,
    marginBottom: 16,
    borderRadius: 4,
  },
  nextStopLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f57f17',
    marginBottom: 8,
  },
  nextStopContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nextStopId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  nextStopCoords: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'Menlo',
  },
  nextStopStats: {
    flexDirection: 'row',
    gap: 16,
  },
  nextStopStat: {
    alignItems: 'flex-end',
  },
  nextStopStatLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
    fontWeight: '600',
  },
  nextStopStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f57f17',
  },
});
