/**
 * OpenWeatherMapService.js
 * Service for interacting with the OpenWeatherMap API
 */

import { OPEN_WEATHER_MAP_CONFIG, ENV } from '../config/api';

class OpenWeatherMapService {
  constructor() {
    this.apiKey = OPEN_WEATHER_MAP_CONFIG.API_KEY;
    this.baseUrl = OPEN_WEATHER_MAP_CONFIG.BASE_URL;
    this.endpoints = OPEN_WEATHER_MAP_CONFIG.ENDPOINTS;
    this.defaultParams = OPEN_WEATHER_MAP_CONFIG.DEFAULT_PARAMS;
    this.rateLimits = OPEN_WEATHER_MAP_CONFIG.RATE_LIMIT;

    // Rate limiting tracking
    this.lastRequestTime = null;
    this.requestCount = 0;
    this.dailyRequestReset = null;
    this.requestQueue = [];
    this.processingQueue = false;
  }

  /**
   * Builds a URL for the OpenWeatherMap API
   * @param {string} endpoint - The API endpoint
   * @param {Object} params - Query parameters for the request
   * @returns {string} - The complete URL
   */
  buildUrl(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add API key
    url.searchParams.append('appid', this.apiKey);

    // Add default parameters
    Object.entries(this.defaultParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    // Add custom parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return url.toString();
  }

  /**
   * Makes a request to the OpenWeatherMap API with rate limiting
   * @param {string} endpoint - The API endpoint
   * @param {Object} params - Query parameters for the request
   * @returns {Promise<Object>} - The response data
   */
  async makeRequest(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      // Add request to queue
      this.requestQueue.push({ endpoint, params, resolve, reject });

      // Process queue if not already processing
      if (!this.processingQueue) {
        this.processRequestQueue();
      }
    });
  }

  /**
   * Processes the request queue with rate limiting
   */
  async processRequestQueue() {
    if (this.requestQueue.length === 0) {
      this.processingQueue = false;
      return;
    }

    this.processingQueue = true;
    const { endpoint, params, resolve, reject } = this.requestQueue.shift();

    try {
      // Check and enforce rate limits
      await this.enforceRateLimit();

      // Make the actual API request
      const url = this.buildUrl(endpoint, params);
      if (ENV.ENABLE_API_LOGS) {
        console.log(`[OpenWeatherMapService] Request: ${url}`);
      }

      const response = await fetch(url);
      const data = await this.handleResponse(response);

      // Update rate limiting tracking
      this.lastRequestTime = Date.now();
      this.requestCount++;

      resolve(data);
    } catch (error) {
      reject(error);
    } finally {
      // Process next request in queue
      setTimeout(() => this.processRequestQueue(), 50);
    }
  }

  /**
   * Enforces rate limits by adding delays or rejecting requests
   */
  async enforceRateLimit() {
    // Initialize daily request counter if needed
    const now = Date.now();
    if (!this.dailyRequestReset || now - this.dailyRequestReset > 24 * 60 * 60 * 1000) {
      this.dailyRequestReset = now;
      this.requestCount = 0;
    }

    // Check if we've exceeded the daily limit
    if (this.requestCount >= this.rateLimits.MAX_REQUESTS_PER_DAY) {
      throw new Error('Daily API request limit exceeded');
    }

    // Add delay between requests if needed
    if (this.lastRequestTime) {
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.rateLimits.COOLDOWN_PERIOD) {
        const delay = this.rateLimits.COOLDOWN_PERIOD - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Handles the API response and error checking
   * @param {Response} response - The fetch Response object
   * @returns {Promise<Object>} - The parsed response data
   */
  async handleResponse(response) {
    const data = await response.json();

    // Handle HTTP errors
    if (!response.ok) {
      const error = new Error(data.message || 'An error occurred with the OpenWeatherMap API request');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    // Handle API-specific errors
    if (data.cod && data.cod !== 200 && data.cod !== '200') {
      const error = new Error(data.message || 'An error occurred with the OpenWeatherMap API');
      error.code = data.cod;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Get current weather for a location
   * @param {Object} params - Parameters for the request
   * @param {string} params.q - City name, state code and country code (e.g., "London,uk")
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {string} params.zip - Zip/postal code (e.g., "94040,us")
   * @returns {Promise<Object>} - Current weather data
   */
  async getCurrentWeather(params) {
    if (!params.q && !params.lat && !params.lon && !params.zip && !params.id) {
      throw new Error('You must provide a location parameter (q, lat & lon, zip, or id)');
    }

    return this.makeRequest(this.endpoints.CURRENT_WEATHER, params);
  }

  /**
   * Get 5-day weather forecast for a location
   * @param {Object} params - Parameters for the request
   * @param {string} params.q - City name, state code and country code (e.g., "London,uk")
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {string} params.zip - Zip/postal code (e.g., "94040,us")
   * @returns {Promise<Object>} - Forecast data
   */
  async getForecast(params) {
    if (!params.q && !params.lat && !params.lon && !params.zip && !params.id) {
      throw new Error('You must provide a location parameter (q, lat & lon, zip, or id)');
    }

    return this.makeRequest(this.endpoints.FORECAST, params);
  }
}

// Export as singleton
export default new OpenWeatherMapService();