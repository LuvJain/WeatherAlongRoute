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
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import WeatherDisplay from './WeatherDisplay';
import WeatherDataManager from '../services/WeatherDataManager';

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
      weatherData: null
    };
  }

  componentDidMount() {
    // Load the last searched location when component mounts and pre-populate
    this.loadLastSearchedLocation()
      .then(() => {
        // Automatically search with the last location if one exists
        if (this.state.lastSearched && this.state.searchQuery) {
          // Give a slight delay to allow UI to render first
          setTimeout(() => this.handleSearch(), 500);
        }
      });
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
   * Render the location search section
   */
  renderSearchSection = () => {
    const { searchQuery, isLoading, error, lastSearched } = this.state;

    return (
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Weather Search</Text>

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

  render() {
    const { selectedLocation, weatherData } = this.state;

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
                  <WeatherDisplay location={selectedLocation} />
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
  },
});

export default WeatherDashboard;