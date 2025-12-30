/**
 * WeatherDisplay.js
 * Component for displaying weather information
 */

import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import WeatherDataManager from '../services/WeatherDataManager';

// Get device dimensions for responsive design
const { width, height } = Dimensions.get('window');
const isTablet = width > 600; // Simple tablet detection

class WeatherDisplay extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      error: null,
      currentWeather: null,
      forecast: null,
      displayForecast: true,
    };
  }

  componentDidMount() {
    if (this.props.location) {
      this.fetchWeatherData();
    }
  }

  componentDidUpdate(prevProps) {
    // If location changed, fetch new weather data
    if (this.props.location !== prevProps.location && this.props.location) {
      this.fetchWeatherData();
    }
  }

  /**
   * Fetch weather data for the current location
   * @param {boolean} forceRefresh - Whether to bypass cache
   */
  fetchWeatherData = async (forceRefresh = false) => {
    const { location } = this.props;

    // Return if no location is provided
    if (!location) {
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      // Convert location format to OpenWeatherMap parameters
      const params = this.getLocationParams(location);

      // Get both current weather and forecast
      const { current, forecast } = await WeatherDataManager.getWeatherAndForecast(
        params,
        forceRefresh
      );

      this.setState({
        isLoading: false,
        currentWeather: current,
        forecast: forecast,
      });
    } catch (error) {
      console.error('Error fetching weather:', error);
      this.setState({
        isLoading: false,
        error: error.message || 'Failed to load weather data',
      });
    }
  };

  /**
   * Convert location to OpenWeatherMap parameters
   * @param {Object} location - Location object from props
   * @returns {Object} - Parameters for OpenWeatherMap API
   */
  getLocationParams = (location) => {
    // If location is already formatted for OpenWeatherMap, use it directly
    if (location.q || location.lat || location.zip) {
      return location;
    }

    // Handle Google Places API location format
    if (location.geometry && location.geometry.location) {
      return {
        lat: location.geometry.location.lat,
        lon: location.geometry.location.lng
      };
    }

    // Handle location object with lat/lon directly
    if (location.lat && location.lon) {
      return { lat: location.lat, lon: location.lon };
    }

    // Fallback to using name if available
    if (location.name) {
      return { q: location.name };
    }

    throw new Error('Unsupported location format');
  };

  /**
   * Force refresh of weather data
   */
  handleRefresh = () => {
    this.fetchWeatherData(true);
  };

  /**
   * Toggle between showing forecast and current weather
   */
  toggleForecast = () => {
    this.setState(prevState => ({
      displayForecast: !prevState.displayForecast
    }));
  };

  /**
   * Get icon URL from OpenWeatherMap
   * @param {string} iconCode - Weather icon code
   * @returns {string} - URL to weather icon
   */
  getWeatherIconUrl = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  /**
   * Format temperature based on units
   * @param {number} temp - Temperature value
   * @returns {string} - Formatted temperature
   */
  formatTemperature = (temp) => {
    // Default to metric (Celsius)
    return `${Math.round(temp)}°C`;
  };

  /**
   * Format date for forecast display
   * @param {number} timestamp - Unix timestamp
   * @returns {string} - Formatted date string
   */
  formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Render current weather information
   */
  renderCurrentWeather = () => {
    const { currentWeather } = this.state;

    if (!currentWeather) {
      return null;
    }

    // Format date for last updated display
    const lastUpdated = new Date();
    const formattedDate = lastUpdated.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.weatherContainer}>
        <View style={styles.locationHeader}>
          <Text style={styles.locationName}>{currentWeather.name}, {currentWeather.sys.country}</Text>
          <Text style={styles.lastUpdated}>Last updated: {formattedDate}</Text>
        </View>

        <View style={styles.weatherMain}>
          <View style={styles.temperatureContainer}>
            <Text style={styles.temperature}>
              {this.formatTemperature(currentWeather.main.temp)}
            </Text>
            <Text style={styles.feelsLike}>
              Feels like: {this.formatTemperature(currentWeather.main.feels_like)}
            </Text>
            <View style={styles.minMaxContainer}>
              <Text style={styles.minMaxTemp}>
                H: {this.formatTemperature(currentWeather.main.temp_max)}
              </Text>
              <Text style={styles.minMaxTemp}>
                L: {this.formatTemperature(currentWeather.main.temp_min)}
              </Text>
            </View>
          </View>

          <View style={styles.conditionContainer}>
            <Image
              source={{ uri: this.getWeatherIconUrl(currentWeather.weather[0].icon) }}
              style={styles.weatherIcon}
            />
            <Text style={styles.weatherCondition}>
              {currentWeather.weather[0].main}
            </Text>
            <Text style={styles.weatherDescription}>
              {currentWeather.weather[0].description}
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Humidity</Text>
            <Text style={styles.detailValue}>{currentWeather.main.humidity}%</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Wind</Text>
            <Text style={styles.detailValue}>
              {currentWeather.wind.speed} m/s
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Pressure</Text>
            <Text style={styles.detailValue}>
              {currentWeather.main.pressure} hPa
            </Text>
          </View>

          {currentWeather.visibility && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Visibility</Text>
              <Text style={styles.detailValue}>
                {(currentWeather.visibility / 1000).toFixed(1)} km
              </Text>
            </View>
          )}
        </View>

        {currentWeather.rain && (
          <View style={styles.precipitationContainer}>
            <Text style={styles.precipitationTitle}>Precipitation (last 3h)</Text>
            <Text style={styles.precipitationValue}>
              {currentWeather.rain['3h'] || currentWeather.rain['1h'] || 0} mm
            </Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * Calculate daily summary from hourly forecasts
   * @param {Array} items - Hourly forecast items for a day
   * @returns {Object} - Summary object with min/max temps and dominant weather condition
   */
  calculateDailySummary = (items) => {
    // Initialize with the first item
    let minTemp = items[0].main.temp;
    let maxTemp = items[0].main.temp;

    // Count occurrences of each weather condition to find the dominant one
    const weatherCounts = {};
    let dominantWeather = null;
    let maxCount = 0;

    items.forEach(item => {
      // Update min/max temperatures
      minTemp = Math.min(minTemp, item.main.temp);
      maxTemp = Math.max(maxTemp, item.main.temp);

      // Count weather conditions
      const weatherId = item.weather[0].id;
      weatherCounts[weatherId] = (weatherCounts[weatherId] || 0) + 1;

      if (weatherCounts[weatherId] > maxCount) {
        maxCount = weatherCounts[weatherId];
        dominantWeather = item.weather[0];
      }
    });

    return {
      minTemp,
      maxTemp,
      weatherCondition: dominantWeather
    };
  };

  /**
   * Render weather forecast
   */
  renderForecast = () => {
    const { forecast } = this.state;

    if (!forecast || !forecast.list) {
      return null;
    }

    // Group forecast by day
    const groupedForecast = {};
    forecast.list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      if (!groupedForecast[date]) {
        groupedForecast[date] = [];
      }
      groupedForecast[date].push(item);
    });

    // Get only the first 5 days for 5-day forecast
    const fiveDayForecast = Object.entries(groupedForecast).slice(0, 5);

    return (
      <View style={styles.forecastContainer}>
        <Text style={styles.forecastTitle}>5-Day Forecast</Text>

        {/* Daily summary view */}
        <View style={styles.dailySummaryContainer}>
          {fiveDayForecast.map(([date, items]) => {
            const summary = this.calculateDailySummary(items);
            const dateObj = new Date(items[0].dt * 1000);

            return (
              <View key={date} style={styles.dailySummaryItem}>
                <Text style={styles.dailySummaryDay}>
                  {dateObj.toLocaleDateString('en-US', {
                    weekday: 'short',
                  })}
                </Text>
                <Text style={styles.dailySummaryDate}>
                  {dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Image
                  source={{ uri: this.getWeatherIconUrl(summary.weatherCondition.icon) }}
                  style={styles.dailySummaryIcon}
                />
                <Text style={styles.dailySummaryDescription}>
                  {summary.weatherCondition.main}
                </Text>
                <View style={styles.dailySummaryTemps}>
                  <Text style={styles.dailySummaryHighTemp}>
                    {this.formatTemperature(summary.maxTemp)}
                  </Text>
                  <Text style={styles.dailySummaryLowTemp}>
                    {this.formatTemperature(summary.minTemp)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Detailed hourly forecast */}
        <Text style={styles.hourlyForecastTitle}>Hourly Forecast</Text>
        <ScrollView horizontal={false} style={styles.forecastScroll}>
          {fiveDayForecast.map(([date, items]) => (
            <View key={date} style={styles.forecastDay}>
              <Text style={styles.forecastDate}>
                {new Date(items[0].dt * 1000).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>

              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                {items.map((item, index) => (
                  <View key={index} style={styles.forecastItem}>
                    <Text style={styles.forecastTime}>
                      {new Date(item.dt * 1000).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Image
                      source={{ uri: this.getWeatherIconUrl(item.weather[0].icon) }}
                      style={styles.forecastIcon}
                    />
                    <Text style={styles.forecastTemp}>
                      {this.formatTemperature(item.main.temp)}
                    </Text>
                    <View style={styles.forecastDetails}>
                      <Text style={styles.forecastDescription}>
                        {item.weather[0].description}
                      </Text>
                      <Text style={styles.forecastHumidity}>
                        Humidity: {item.main.humidity}%
                      </Text>
                      <Text style={styles.forecastWind}>
                        Wind: {item.wind.speed} m/s
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  render() {
    const { isLoading, error, displayForecast } = this.state;

    // Show loading indicator
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading weather data...</Text>
        </View>
      );
    }

    // Show error message
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Error: {error}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRefresh}>
              <Text style={styles.retryButtonText}>Refresh Data</Text>
            </TouchableOpacity>
          </View>
          {this.state.currentWeather && this.state.currentWeather.isExpiredCache && (
            <View style={styles.expiredCacheNotice}>
              <Text style={styles.expiredCacheText}>
                Showing cached data from previous search.
                Network connection is required for the latest data.
              </Text>
            </View>
          )}
        </View>
      );
    }

    // No location provided yet
    if (!this.props.location) {
      return (
        <View style={styles.noLocationContainer}>
          <Text style={styles.noLocationText}>
            Select a location to see weather information
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              !displayForecast ? styles.activeToggle : null
            ]}
            onPress={() => this.setState({ displayForecast: false })}
          >
            <Text style={styles.toggleText}>Current</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              displayForecast ? styles.activeToggle : null
            ]}
            onPress={() => this.setState({ displayForecast: true })}
          >
            <Text style={styles.toggleText}>Forecast</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.refreshContainer}>
          <TouchableOpacity style={styles.refreshButton} onPress={this.handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {!displayForecast ? this.renderCurrentWeather() : this.renderForecast()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  // Base Styles
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff5f5',
    margin: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 15,
  },
  errorText: {
    marginBottom: 20,
    fontSize: isTablet ? 18 : 16,
    color: '#e74c3c',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  retryButton: {
    padding: 12,
    backgroundColor: '#3498db',
    borderRadius: 5,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
  },
  expiredCacheNotice: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
  },
  expiredCacheText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noLocationText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },

  // Toggle Controls
  toggleContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: isTablet ? 10 : 0,
    marginHorizontal: isTablet ? 15 : 0,
    shadowColor: isTablet ? '#000' : 'transparent',
    shadowOffset: isTablet ? { width: 0, height: 2 } : { width: 0, height: 0 },
    shadowOpacity: isTablet ? 0.1 : 0,
    shadowRadius: isTablet ? 4 : 0,
    elevation: isTablet ? 3 : 0,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeToggle: {
    borderBottomColor: '#3498db',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  refreshContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  refreshButtonText: {
    color: '#3498db',
  },

  // Current Weather Section
  weatherContainer: {
    margin: 15,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 15,
  },
  locationHeader: {
    marginBottom: 15,
  },
  locationName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 5,
  },
  weatherMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    ...(isTablet && { paddingHorizontal: 20 }),
  },
  temperatureContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  temperature: {
    fontSize: isTablet ? 60 : 42,
    fontWeight: 'bold',
    color: '#333',
  },
  feelsLike: {
    fontSize: isTablet ? 18 : 16,
    color: '#666',
    marginTop: 5,
  },
  minMaxContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  minMaxTemp: {
    fontSize: isTablet ? 16 : 14,
    color: '#666',
    marginRight: 10,
  },
  conditionContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weatherIcon: {
    width: isTablet ? 100 : 80,
    height: isTablet ? 100 : 80,
  },
  weatherCondition: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '500',
  },
  weatherDescription: {
    fontSize: isTablet ? 18 : 16,
    color: '#666',
    textAlign: 'center',
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  detailItem: {
    width: isTablet ? '25%' : '50%',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: isTablet ? 16 : 14,
    color: '#666',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '500',
  },
  precipitationContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    alignItems: 'center',
  },
  precipitationTitle: {
    fontSize: isTablet ? 16 : 14,
    color: '#3498db',
    marginBottom: 5,
  },
  precipitationValue: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '500',
  },

  // Forecast Section
  forecastContainer: {
    margin: 15,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 15,
    flex: 1,
  },
  forecastTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },

  // Daily summary section (new)
  dailySummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  dailySummaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  dailySummaryDay: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: 'bold',
  },
  dailySummaryDate: {
    fontSize: isTablet ? 14 : 12,
    color: '#666',
    marginBottom: 5,
  },
  dailySummaryIcon: {
    width: isTablet ? 60 : 40,
    height: isTablet ? 60 : 40,
  },
  dailySummaryDescription: {
    fontSize: isTablet ? 14 : 12,
    textAlign: 'center',
    marginBottom: 5,
  },
  dailySummaryTemps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  dailySummaryHighTemp: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginRight: 5,
  },
  dailySummaryLowTemp: {
    fontSize: isTablet ? 16 : 14,
    color: '#3498db',
  },

  // Hourly forecast section
  hourlyForecastTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  forecastScroll: {
    flex: 1,
    maxHeight: isTablet ? 500 : 400,
  },
  forecastDay: {
    marginBottom: 20,
  },
  forecastDate: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#34495e',
  },
  forecastItem: {
    padding: isTablet ? 15 : 10,
    alignItems: 'center',
    marginRight: 15,
    minWidth: isTablet ? 110 : 90,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  forecastTime: {
    fontSize: isTablet ? 16 : 14,
    marginBottom: 5,
    fontWeight: '500',
  },
  forecastIcon: {
    width: isTablet ? 60 : 50,
    height: isTablet ? 60 : 50,
  },
  forecastTemp: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '500',
    marginVertical: 5,
    color: '#333',
  },
  forecastDetails: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 5,
    marginTop: 5,
    width: '100%',
  },
  forecastDescription: {
    fontSize: isTablet ? 14 : 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  forecastHumidity: {
    fontSize: isTablet ? 12 : 10,
    color: '#3498db',
    marginBottom: 3,
  },
  forecastWind: {
    fontSize: isTablet ? 12 : 10,
    color: '#7f8c8d',
  },
});

export default WeatherDisplay;