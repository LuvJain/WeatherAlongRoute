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
} from 'react-native';
import WeatherDataManager from '../services/WeatherDataManager';

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

    return (
      <View style={styles.weatherContainer}>
        <Text style={styles.locationName}>{currentWeather.name}, {currentWeather.sys.country}</Text>

        <View style={styles.weatherMain}>
          <View style={styles.temperatureContainer}>
            <Text style={styles.temperature}>
              {this.formatTemperature(currentWeather.main.temp)}
            </Text>
            <Text style={styles.feelsLike}>
              Feels like: {this.formatTemperature(currentWeather.main.feels_like)}
            </Text>
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
            <Text style={styles.detailLabel}>Humidity:</Text>
            <Text style={styles.detailValue}>{currentWeather.main.humidity}%</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Wind:</Text>
            <Text style={styles.detailValue}>
              {currentWeather.wind.speed} m/s
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Pressure:</Text>
            <Text style={styles.detailValue}>
              {currentWeather.main.pressure} hPa
            </Text>
          </View>
        </View>
      </View>
    );
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

    return (
      <View style={styles.forecastContainer}>
        <Text style={styles.forecastTitle}>5-Day Forecast</Text>
        <ScrollView horizontal={false} style={styles.forecastScroll}>
          {Object.entries(groupedForecast).map(([date, items]) => (
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
                    <Text style={styles.forecastDescription}>
                      {item.weather[0].description}
                    </Text>
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
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
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
  },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
  },
  retryButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
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
  toggleContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeToggle: {
    borderBottomColor: '#007AFF',
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
    color: '#007AFF',
  },
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
  locationName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  weatherMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  temperatureContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  temperature: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  feelsLike: {
    fontSize: 16,
    color: '#666',
  },
  conditionContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weatherIcon: {
    width: 80,
    height: 80,
  },
  weatherCondition: {
    fontSize: 20,
    fontWeight: '500',
  },
  weatherDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  forecastScroll: {
    flex: 1,
  },
  forecastDay: {
    marginBottom: 20,
  },
  forecastDate: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  forecastItem: {
    padding: 10,
    alignItems: 'center',
    marginRight: 15,
    minWidth: 80,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  forecastTime: {
    fontSize: 14,
    marginBottom: 5,
  },
  forecastIcon: {
    width: 50,
    height: 50,
  },
  forecastTemp: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 5,
  },
  forecastDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default WeatherDisplay;