/**
 * WeatherDashboard.js
 * A dashboard component that includes location input and weather display
 */

import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import WeatherDisplay from './WeatherDisplay';
import WeatherDataManager from '../services/WeatherDataManager';
import GeoLocationService, { GEO_PREFERENCES } from '../services/GeoLocationService';

// Constants
const STORAGE_KEY = 'weather_dashboard_last_search';
const { width, height } = Dimensions.get('window');
const isTablet = width > 600; // Simple tablet detection

class WeatherDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchQuery: '',
      selectedLocation: null,
      isLoading: false,
      error: null,
      lastSearched: null,
      isZipCode: false,
      weatherData: null,
      geoLocationStatus: null,
      isGeoLocating: false,
      geoLocationEnabled: false,
      geoLocationError: null
    };
  }

  componentDidMount() {
    // Check if geolocation is supported
    const isGeoSupported = GeoLocationService.isSupported();
    this.setState({ geoLocationStatus: isGeoSupported ? 'supported' : 'unsupported' });

    // First check for geolocation preferences
    this.checkGeoLocationPreferences()
      .then(() => {
        // If geolocation is enabled, use it
        if (this.state.geoLocationEnabled) {
          // Try to use geolocation
          this.handleGetCurrentLocation();
        } else {
          // Otherwise, fall back to the last searched location
          return this.loadLastSearchedLocation()
            .then(() => {
              // Automatically search with the last location if one exists
              if (this.state.lastSearched && this.state.searchQuery) {
                // Give a slight delay to allow UI to render first
                setTimeout(() => this.handleSearch(), 500);
              }
            });
        }
      });
  }

  /**
   * Check user's geolocation preferences
   * @returns {Promise<void>}
   */
  async checkGeoLocationPreferences() {
    try {
      // Get user's preference
      const preference = await GeoLocationService.getUserPreference();

      // Set geolocation status based on preference
      switch (preference) {
        case GEO_PREFERENCES.ENABLED:
          this.setState({
            geoLocationEnabled: true,
            geoLocationStatus: 'enabled'
          });
          break;
        case GEO_PREFERENCES.DISABLED:
          this.setState({
            geoLocationEnabled: false,
            geoLocationStatus: 'disabled'
          });
          break;
        case GEO_PREFERENCES.DENIED:
          this.setState({
            geoLocationEnabled: false,
            geoLocationStatus: 'denied'
          });
          break;
        case GEO_PREFERENCES.UNAVAILABLE:
          this.setState({
            geoLocationEnabled: false,
            geoLocationStatus: 'unsupported'
          });
          break;
        default:
          // If unset, we'll ask for permission when user requests it
          this.setState({
            geoLocationEnabled: false,
            geoLocationStatus: 'unset'
          });
      }

      // Also check if there's a cached location
      const lastLocation = await GeoLocationService.getLastLocation();
      if (lastLocation && this.state.geoLocationEnabled) {
        // We have a cached location and geolocation is enabled
        this.setState({
          geoLocationLastCoords: lastLocation,
        });
      }
    } catch (error) {
      console.error('Error checking geolocation preferences:', error);
    }
  }

  /**
   * Load the last searched location from AsyncStorage
   * @returns {Promise<void>} - A promise that resolves when loading is complete
   */
  loadLastSearchedLocation = async () => {
    try {
      const savedSearch = await AsyncStorage.getItem(STORAGE_KEY);

      if (savedSearch) {
        const parsedSearch = JSON.parse(savedSearch);

        // Validate the timestamp to ensure it's not too old (e.g., more than 24 hours)
        const lastSearchTime = new Date(parsedSearch.timestamp).getTime();
        const currentTime = new Date().getTime();
        const timeDifference = currentTime - lastSearchTime;
        const hoursDifference = timeDifference / (1000 * 60 * 60);

        // If the last search was within the last 24 hours, pre-populate
        if (hoursDifference < 24) {
          await new Promise((resolve) => {
            this.setState({
              lastSearched: parsedSearch,
              searchQuery: parsedSearch.query || '',
              isZipCode: parsedSearch.isZipCode || false
            }, resolve);
          });

          // Auto-populate with the last search location if available
          if (parsedSearch.location) {
            await new Promise((resolve) => {
              this.setState({ selectedLocation: parsedSearch.location }, resolve);
            });
          }

          console.log('Pre-populated with last search:', parsedSearch.query);
        } else {
          console.log('Last search is more than 24 hours old, not pre-populating');
        }
      }
    } catch (error) {
      console.error('Failed to load last searched location:', error);
    }
  };

  /**
   * Save the last searched location to AsyncStorage
   */
  saveLastSearchedLocation = async (query, location, isZipCode) => {
    try {
      const searchData = {
        timestamp: new Date().toISOString(),
        query,
        location,
        isZipCode
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(searchData));
      this.setState({ lastSearched: searchData });
    } catch (error) {
      console.error('Failed to save searched location:', error);
    }
  };

  /**
   * Determine if the input is a ZIP code
   */
  isZipCodeInput = (input) => {
    // Simple ZIP code validation - US 5-digit or ZIP+4 format
    // Can be extended to support international postal codes
    const usZipRegex = /^\d{5}(?:-\d{4})?$/;

    return usZipRegex.test(input.trim());
  };

  /**
   * Handle search input change
   */
  handleSearchInputChange = (text) => {
    this.setState({
      searchQuery: text,
      isZipCode: this.isZipCodeInput(text)
    });
  };

  /**
   * Get user-friendly error message from API error
   * @param {Error} error - The error object
   * @returns {string} - User-friendly error message
   */
  getErrorMessage = (error) => {
    // Default error message
    let userMessage = 'Failed to load weather data. Please try again later.';

    // If we have a message from the API, use it
    if (error.message) {
      if (error.message.includes('city not found')) {
        return 'City not found. Please check your spelling and try again.';
      }

      if (error.message.includes('Invalid API key')) {
        return 'Service configuration error. Please contact the app administrator.';
      }

      if (error.status === 429 || error.message.includes('too many requests')) {
        return 'Weather service is temporarily unavailable due to high demand. Please try again in a few minutes.';
      }

      if (error.code && error.code === 404 || error.status === 404) {
        if (this.state.isZipCode) {
          return 'ZIP code not found. Please check and try again.';
        } else {
          return 'Location not found. Please check the city name and try again.';
        }
      }

      // Network errors
      if (error.message.includes('Network') || error.message.includes('network') ||
          error.message.includes('offline') || error.message.includes('connection')) {
        return 'Network connection issue. Please check your internet connection and try again.';
      }

      // If no specific case matched but we have a message, use it with some context
      return `Error: ${error.message}`;
    }

    return userMessage;
  };

  /**
   * Search for weather by the entered location
   */
  handleSearch = async () => {
    const { searchQuery, isZipCode } = this.state;

    if (!searchQuery.trim()) {
      this.setState({ error: 'Please enter a city name or ZIP code' });
      return;
    }

    this.setState({ isLoading: true, error: null, weatherData: null });

    try {
      // Format the query based on whether it's a ZIP code or city name
      const locationParams = isZipCode
        ? { zip: searchQuery.trim() }
        : { q: searchQuery.trim() };

      // Validate ZIP code format if user is searching by ZIP
      if (isZipCode && !this.isZipCodeInput(searchQuery.trim())) {
        throw new Error('Invalid ZIP code format');
      }

      // Get both current weather and forecast
      const data = await WeatherDataManager.getWeatherAndForecast(locationParams);

      // Validate the response data
      if (!data.current || !data.forecast) {
        throw new Error('Invalid data received from weather service');
      }

      // Create a location object similar to the format expected by WeatherDisplay
      const locationObj = {
        name: data.current.name,
        ...locationParams
      };

      // Update state with the weather data and location
      this.setState({
        selectedLocation: locationObj,
        isLoading: false,
        weatherData: data,
        error: null // Clear any previous errors
      });

      // Save this search to AsyncStorage
      this.saveLastSearchedLocation(searchQuery, locationObj, isZipCode);
    } catch (error) {
      console.error('Error fetching weather:', error);

      // Get user-friendly error message
      const errorMessage = this.getErrorMessage(error);

      this.setState({
        isLoading: false,
        error: errorMessage,
        weatherData: null
      });
    }
  };

  /**
   * Clear the search and results
   */
  handleClearSearch = () => {
    this.setState({
      searchQuery: '',
      selectedLocation: null,
      weatherData: null,
      error: null
    });
  };

  /**
   * Toggle geolocation on/off
   */
  handleToggleGeolocation = () => {
    if (this.state.geoLocationEnabled) {
      // Disable geolocation
      this.setState({
        geoLocationEnabled: false,
        geoLocationStatus: 'disabled'
      });
      GeoLocationService.saveUserPreference(GEO_PREFERENCES.DISABLED);
    } else {
      // Request geolocation permission
      this.requestGeolocationPermission();
    }
  };

  /**
   * Request geolocation permission from the user
   */
  requestGeolocationPermission = async () => {
    if (!GeoLocationService.isSupported()) {
      Alert.alert(
        'Geolocation Not Supported',
        'Your device or browser does not support geolocation.',
        [{ text: 'OK', onPress: () => {} }]
      );
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Use Current Location',
      'This will use your current location to provide local weather information. Would you like to continue?',
      [
        {
          text: 'No',
          onPress: () => {
            // User manually declined
            this.setState({
              geoLocationEnabled: false,
              geoLocationStatus: 'disabled'
            });
            GeoLocationService.saveUserPreference(GEO_PREFERENCES.DISABLED);
          },
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => this.handleGetCurrentLocation()
        }
      ],
      { cancelable: false }
    );
  };

  /**
   * Get the current location and fetch weather
   */
  handleGetCurrentLocation = () => {
    this.setState({
      isGeoLocating: true,
      geoLocationError: null,
      error: null
    });

    GeoLocationService.getCurrentPosition()
      .then(location => {
        // Successfully got location
        this.setState({
          isGeoLocating: false,
          geoLocationEnabled: true,
          geoLocationStatus: 'enabled',
          geoLocationLastCoords: location
        });

        // Get weather for the current location
        this.getWeatherByCoordinates(location);
      })
      .catch(error => {
        console.error('Geolocation error:', error);

        // Handle specific error cases
        if (error.code === 1) {
          // Permission denied by user or browser
          this.setState({
            isGeoLocating: false,
            geoLocationEnabled: false,
            geoLocationStatus: 'denied',
            geoLocationError: error.message || 'Location permission denied'
          });
        } else {
          // Other errors (timeout, position unavailable, etc.)
          this.setState({
            isGeoLocating: false,
            geoLocationError: error.message || 'Failed to get current location'
          });
        }

        // Fall back to last searched location if available
        if (this.state.lastSearched && this.state.searchQuery) {
          setTimeout(() => this.handleSearch(), 500);
        }
      });
  };

  /**
   * Fetch weather data using coordinates
   * @param {Object} location - The location object with coordinates
   */
  getWeatherByCoordinates = async (location) => {
    this.setState({
      isLoading: true,
      error: null,
      weatherData: null
    });

    try {
      // Convert location to API parameters
      const locationParams = GeoLocationService.locationToApiParams(location);

      // Get both current weather and forecast
      const data = await WeatherDataManager.getWeatherAndForecast(locationParams);

      // Validate the response data
      if (!data.current || !data.forecast) {
        throw new Error('Invalid data received from weather service');
      }

      // Create a location object similar to the format expected by WeatherDisplay
      const locationObj = {
        name: data.current.name,
        // Include coordinates for refresh
        lat: location.latitude,
        lon: location.longitude,
        isGeoLocation: true
      };

      // Update state with the weather data and location
      this.setState({
        selectedLocation: locationObj,
        isLoading: false,
        weatherData: data,
        error: null // Clear any previous errors
      });
    } catch (error) {
      console.error('Error fetching weather by coordinates:', error);

      // Get user-friendly error message
      const errorMessage = this.getErrorMessage(error);

      this.setState({
        isLoading: false,
        error: errorMessage,
        weatherData: null
      });
    }
  };

  /**
   * Render the location search section
   */
  renderSearchSection = () => {
    const {
      searchQuery,
      isLoading,
      error,
      lastSearched,
      geoLocationStatus,
      geoLocationEnabled,
      isGeoLocating,
      geoLocationError
    } = this.state;

    // Determine geolocation button text based on status
    let geoButtonText = 'Use My Location';
    let geoButtonIcon = '📍';

    if (isGeoLocating) {
      geoButtonText = 'Getting Location...';
      geoButtonIcon = '⏳';
    } else if (geoLocationEnabled) {
      geoButtonText = 'Location Enabled';
      geoButtonIcon = '✅';
    } else if (geoLocationStatus === 'denied') {
      geoButtonText = 'Location Access Denied';
      geoButtonIcon = '🚫';
    } else if (geoLocationStatus === 'unsupported') {
      geoButtonText = 'Location Not Supported';
      geoButtonIcon = '❌';
    }

    return (
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Weather Search</Text>

        {/* Geolocation button */}
        <TouchableOpacity
          style={[
            styles.geoLocationButton,
            geoLocationEnabled && styles.geoLocationButtonActive,
            geoLocationStatus === 'denied' && styles.geoLocationButtonDenied,
            geoLocationStatus === 'unsupported' && styles.geoLocationButtonDisabled
          ]}
          onPress={this.handleToggleGeolocation}
          disabled={isGeoLocating || geoLocationStatus === 'unsupported'}
        >
          <Text style={styles.geoLocationIcon}>{geoButtonIcon}</Text>
          <Text style={styles.geoLocationButtonText}>{geoButtonText}</Text>
        </TouchableOpacity>

        {geoLocationError && (
          <View style={styles.geoLocationErrorContainer}>
            <Text style={styles.geoLocationErrorText}>{geoLocationError}</Text>
          </View>
        )}

        {/* Manual search section */}
        <Text style={styles.searchSubtitle}>Or enter a location manually:</Text>

        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter city name or ZIP code"
            value={searchQuery}
            onChangeText={this.handleSearchInputChange}
            onSubmitEditing={this.handleSearch}
            returnKeyType="search"
            autoCapitalize="words"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />

          <TouchableOpacity
            style={styles.searchButton}
            onPress={this.handleSearch}
            disabled={isLoading}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {lastSearched && !error && !isLoading && !this.state.selectedLocation && (
          <View style={styles.lastSearchContainer}>
            <Text style={styles.lastSearchLabel}>Recent search:</Text>
            <TouchableOpacity
              style={styles.lastSearchButton}
              onPress={() => {
                this.setState({
                  searchQuery: lastSearched.query,
                  isZipCode: lastSearched.isZipCode
                }, this.handleSearch);
              }}
            >
              <Text style={styles.lastSearchText}>
                {lastSearched.query}
              </Text>
              <Text style={styles.lastSearchTimestamp}>
                {new Date(lastSearched.timestamp).toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.tryAgainButton}
              onPress={this.handleSearch}
            >
              <Text style={styles.tryAgainButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0000ff" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}
      </View>
    );
  };

  renderWeatherSection = () => {
    const { selectedLocation, weatherData, geoLocationEnabled } = this.state;

    if (!selectedLocation || !weatherData) {
      return null;
    }

    return (
      <View style={styles.weatherContainer}>
        {/* Location refresh button for geolocation */}
        {selectedLocation.isGeoLocation && geoLocationEnabled && (
          <TouchableOpacity
            style={styles.refreshLocationButton}
            onPress={this.handleGetCurrentLocation}
          >
            <Text style={styles.refreshLocationIcon}>🔄</Text>
            <Text style={styles.refreshLocationText}>Refresh Location</Text>
          </TouchableOpacity>
        )}

        <WeatherDisplay location={selectedLocation} />
      </View>
    );
  };

  render() {
    const { selectedLocation, weatherData, isLoading } = this.state;

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingContainer}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Weather Dashboard</Text>
            </View>

            {this.renderSearchSection()}

            {selectedLocation && (
              <View style={styles.weatherContainer}>
                {weatherData ? (
                  this.renderWeatherSection()
                ) : (
                  <ActivityIndicator size="large" color="#0000ff" />
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 15,
    backgroundColor: '#3498db',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2980b9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  searchSection: {
    margin: 15,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  searchSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginTop: 15,
    marginBottom: 10,
  },
  // Geolocation button styles
  geoLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  geoLocationButtonActive: {
    backgroundColor: '#e6f7ff',
    borderColor: '#91d5ff',
  },
  geoLocationButtonDenied: {
    backgroundColor: '#fff1f0',
    borderColor: '#ffa39e',
  },
  geoLocationButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d9d9d9',
    opacity: 0.6,
  },
  geoLocationIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  geoLocationButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  geoLocationErrorContainer: {
    padding: 10,
    backgroundColor: '#fff1f0',
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ffa39e',
  },
  geoLocationErrorText: {
    color: '#cf1322',
    fontSize: 13,
  },
  searchInputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    backgroundColor: '#f9f9f9',
  },
  searchButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  lastSearchContainer: {
    marginVertical: 10,
  },
  lastSearchLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  lastSearchButton: {
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#cce5ff',
    marginBottom: 10,
  },
  lastSearchText: {
    color: '#3498db',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 3,
  },
  lastSearchTimestamp: {
    color: '#666',
    fontSize: 12,
  },
  errorContainer: {
    padding: 15,
    backgroundColor: '#fff5f5',
    borderRadius: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ffcccc',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 10,
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  tryAgainButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginTop: 5,
  },
  tryAgainButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  weatherContainer: {
    flex: 1,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6f7ff',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#91d5ff',
    marginBottom: 15,
  },
  refreshLocationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  refreshLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#096dd9',
  },
  // Media queries for responsive design
  '@media (min-width: 600px)': {
    contentContainer: {
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 28,
    },
    searchSection: {
      margin: 20,
      padding: 20,
    },
    searchInput: {
      height: 50,
    },
    searchButton: {
      paddingHorizontal: 20,
    },
    geoLocationButton: {
      padding: 15,
    }
  },
});

export default WeatherDashboard;