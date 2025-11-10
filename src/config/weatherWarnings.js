/**
 * Weather Warning Thresholds Configuration
 * Configurable thresholds for weather warnings
 */

/**
 * Default weather warning thresholds
 * These values can be customized by the application
 */
const defaultWarningThresholds = {
  // Temperature thresholds (°C or °F based on units setting)
  temperature: {
    units: 'celsius',
    high: 35,    // High temperature warning
    extreme: 40, // Extreme temperature warning
    low: 0,      // Low temperature warning
    extremeLow: -15 // Extreme low temperature warning
  },

  // Wind speed thresholds (m/s or mph based on units setting)
  wind: {
    units: 'm/s',
    high: 10,    // High wind warning
    extreme: 17  // Extreme wind warning (~ 38mph / 62kmh)
  },

  // Rain thresholds (mm/h)
  rain: {
    units: 'mm',
    moderate: 2.5, // Moderate rain
    heavy: 10,     // Heavy rain
    extreme: 50    // Extreme rain
  },

  // Snow thresholds (mm/h)
  snow: {
    units: 'mm',
    moderate: 1,  // Moderate snow
    heavy: 5,     // Heavy snow
    extreme: 10   // Extreme snow
  },

  // Visibility thresholds (meters)
  visibility: {
    units: 'm',
    reduced: 5000,   // Reduced visibility
    poor: 1000,      // Poor visibility
    veryPoor: 500    // Very poor visibility
  },

  // Special conditions can be adjusted here
  specialConditions: {
    // By default, all thunderstorms are at least HIGH severity
    // But can be configured to treat some types differently
    thunderstorm: {
      default: 'high',
      '200': 'moderate', // Thunderstorm with light rain is only moderate
    },
    tornado: 'extreme',
    hurricane: 'extreme',
    blizzard: 'high'
  },

  // Route segment warning distance thresholds (in kilometers)
  routeSegments: {
    minSegmentDistance: 10, // Minimum distance between warning segments
    maxSegmentLength: 50,   // Maximum length of a segment for a single warning
    criticalWarningRadius: 2 // Distance around critical warnings to consider affected
  }
};

/**
 * Warning threshold configuration
 */
const warningConfig = {
  // Current active thresholds (starts with defaults)
  activeThresholds: { ...defaultWarningThresholds },

  /**
   * Get current warning thresholds
   * @returns {Object} - Current thresholds
   */
  getThresholds() {
    return { ...this.activeThresholds };
  },

  /**
   * Update warning thresholds
   *
   * @param {Object} newThresholds - New thresholds to apply (partial updates supported)
   * @returns {Object} - Updated thresholds
   */
  setThresholds(newThresholds) {
    if (!newThresholds || typeof newThresholds !== 'object') {
      throw new Error('Invalid thresholds configuration');
    }

    // Deep merge the new thresholds with existing ones
    this.activeThresholds = this._deepMerge(this.activeThresholds, newThresholds);

    return { ...this.activeThresholds };
  },

  /**
   * Reset thresholds to defaults
   * @returns {Object} - Default thresholds
   */
  resetThresholds() {
    this.activeThresholds = { ...defaultWarningThresholds };
    return { ...this.activeThresholds };
  },

  /**
   * Convert units in thresholds (e.g., from metric to imperial)
   *
   * @param {string} units - Units system ('metric' or 'imperial')
   * @returns {Object} - Updated thresholds with converted units
   */
  convertUnits(units) {
    if (units !== 'metric' && units !== 'imperial') {
      throw new Error('Invalid units. Must be "metric" or "imperial"');
    }

    const updated = { ...this.activeThresholds };

    // Convert temperature units
    if (units === 'imperial' && updated.temperature.units === 'celsius') {
      // Convert Celsius to Fahrenheit
      updated.temperature = {
        units: 'fahrenheit',
        high: this._celsiusToFahrenheit(updated.temperature.high),
        extreme: this._celsiusToFahrenheit(updated.temperature.extreme),
        low: this._celsiusToFahrenheit(updated.temperature.low),
        extremeLow: this._celsiusToFahrenheit(updated.temperature.extremeLow)
      };
    } else if (units === 'metric' && updated.temperature.units === 'fahrenheit') {
      // Convert Fahrenheit to Celsius
      updated.temperature = {
        units: 'celsius',
        high: this._fahrenheitToCelsius(updated.temperature.high),
        extreme: this._fahrenheitToCelsius(updated.temperature.extreme),
        low: this._fahrenheitToCelsius(updated.temperature.low),
        extremeLow: this._fahrenheitToCelsius(updated.temperature.extremeLow)
      };
    }

    // Convert wind units
    if (units === 'imperial' && updated.wind.units === 'm/s') {
      // Convert m/s to mph
      updated.wind = {
        units: 'mph',
        high: this._msToMph(updated.wind.high),
        extreme: this._msToMph(updated.wind.extreme)
      };
    } else if (units === 'metric' && updated.wind.units === 'mph') {
      // Convert mph to m/s
      updated.wind = {
        units: 'm/s',
        high: this._mphToMs(updated.wind.high),
        extreme: this._mphToMs(updated.wind.extreme)
      };
    }

    // Other conversions can be added as needed

    this.activeThresholds = updated;
    return { ...this.activeThresholds };
  },

  /**
   * Helper to convert Celsius to Fahrenheit
   * @private
   *
   * @param {number} celsius - Temperature in Celsius
   * @returns {number} - Temperature in Fahrenheit
   */
  _celsiusToFahrenheit(celsius) {
    return Math.round((celsius * 9/5) + 32);
  },

  /**
   * Helper to convert Fahrenheit to Celsius
   * @private
   *
   * @param {number} fahrenheit - Temperature in Fahrenheit
   * @returns {number} - Temperature in Celsius
   */
  _fahrenheitToCelsius(fahrenheit) {
    return Math.round((fahrenheit - 32) * 5/9);
  },

  /**
   * Helper to convert m/s to mph
   * @private
   *
   * @param {number} ms - Speed in meters per second
   * @returns {number} - Speed in miles per hour
   */
  _msToMph(ms) {
    return Math.round(ms * 2.237);
  },

  /**
   * Helper to convert mph to m/s
   * @private
   *
   * @param {number} mph - Speed in miles per hour
   * @returns {number} - Speed in meters per second
   */
  _mphToMs(mph) {
    return Math.round((mph / 2.237) * 10) / 10;
  },

  /**
   * Helper to deep merge objects
   * @private
   *
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} - Merged result
   */
  _deepMerge(target, source) {
    const output = { ...target };

    if (!source) return output;

    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key] && typeof target[key] === 'object') {
          output[key] = this._deepMerge(target[key], source[key]);
        } else {
          output[key] = { ...source[key] };
        }
      } else {
        output[key] = source[key];
      }
    });

    return output;
  }
};

export default warningConfig;