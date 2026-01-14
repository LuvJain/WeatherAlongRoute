/**
 * Weather Severity Classifier
 * Classifies weather conditions based on their severity
 * Provides utility functions for determining weather warnings
 */

/**
 * Severity levels for weather conditions
 * @readonly
 * @enum {string}
 */
export const SEVERITY_LEVELS = {
  NONE: 'none',         // No significant weather impact
  LOW: 'low',           // Minor weather impact, be aware
  MODERATE: 'moderate', // Moderate weather impact, take precautions
  HIGH: 'high',         // Significant weather impact, consider alternative plans
  EXTREME: 'extreme'    // Dangerous weather conditions, avoid travel
};

/**
 * Default weather warning thresholds
 * These can be overridden via configuration
 *
 * @type {Object}
 */
const DEFAULT_THRESHOLDS = {
  temperature: {
    units: 'celsius',
    high: 35,    // °C - High temperature warning
    extreme: 40, // °C - Extreme temperature warning
    low: 0,      // °C - Low temperature warning
    extremeLow: -15 // °C - Extreme low temperature warning
  },
  wind: {
    units: 'm/s',
    high: 10,    // m/s - High wind warning
    extreme: 17  // m/s - Extreme wind warning (~ 38mph / 62kmh)
  },
  rain: {
    units: 'mm',
    moderate: 2.5, // mm/h - Moderate rain
    heavy: 10,     // mm/h - Heavy rain
    extreme: 50    // mm/h - Extreme rain
  },
  snow: {
    units: 'mm',
    moderate: 1,  // mm/h - Moderate snow
    heavy: 5,     // mm/h - Heavy snow
    extreme: 10   // mm/h - Extreme snow
  },
  visibility: {
    units: 'm',
    reduced: 5000,   // m - Reduced visibility
    poor: 1000,      // m - Poor visibility
    veryPoor: 500    // m - Very poor visibility
  },
  weatherConditions: {
    // Map of OpenWeatherMap condition codes to severity levels
    // Reference: https://openweathermap.org/weather-conditions
    thunderstorm: {
      default: SEVERITY_LEVELS.HIGH,
      // Specific thunderstorm types can be configured here
      '200': SEVERITY_LEVELS.MODERATE, // Thunderstorm with light rain
      '201': SEVERITY_LEVELS.HIGH,     // Thunderstorm with rain
      '202': SEVERITY_LEVELS.EXTREME,  // Thunderstorm with heavy rain
      '212': SEVERITY_LEVELS.EXTREME,  // Heavy thunderstorm
      '232': SEVERITY_LEVELS.EXTREME,  // Thunderstorm with heavy drizzle
    },
    drizzle: {
      default: SEVERITY_LEVELS.LOW
    },
    rain: {
      default: SEVERITY_LEVELS.MODERATE,
      '500': SEVERITY_LEVELS.LOW,      // Light rain
      '501': SEVERITY_LEVELS.MODERATE, // Moderate rain
      '502': SEVERITY_LEVELS.HIGH,     // Heavy intensity rain
      '503': SEVERITY_LEVELS.EXTREME,  // Very heavy rain
      '504': SEVERITY_LEVELS.EXTREME,  // Extreme rain
      '511': SEVERITY_LEVELS.HIGH,     // Freezing rain
      '522': SEVERITY_LEVELS.HIGH,     // Heavy shower rain
    },
    snow: {
      default: SEVERITY_LEVELS.MODERATE,
      '600': SEVERITY_LEVELS.LOW,      // Light snow
      '601': SEVERITY_LEVELS.MODERATE, // Snow
      '602': SEVERITY_LEVELS.HIGH,     // Heavy snow
      '616': SEVERITY_LEVELS.MODERATE, // Rain and snow
      '622': SEVERITY_LEVELS.HIGH,     // Heavy shower snow
    },
    atmosphere: {
      default: SEVERITY_LEVELS.MODERATE,
      '701': SEVERITY_LEVELS.LOW,      // Mist
      '711': SEVERITY_LEVELS.HIGH,     // Smoke
      '721': SEVERITY_LEVELS.MODERATE, // Haze
      '731': SEVERITY_LEVELS.HIGH,     // Sand/dust whirls
      '741': SEVERITY_LEVELS.MODERATE, // Fog
      '751': SEVERITY_LEVELS.HIGH,     // Sand
      '762': SEVERITY_LEVELS.HIGH,     // Volcanic ash
      '771': SEVERITY_LEVELS.EXTREME,  // Squalls
      '781': SEVERITY_LEVELS.EXTREME,  // Tornado
    },
    clear: {
      default: SEVERITY_LEVELS.NONE
    },
    clouds: {
      default: SEVERITY_LEVELS.NONE
    }
  }
};

// Store the current thresholds, initially set to default values
let currentThresholds = { ...DEFAULT_THRESHOLDS };

/**
 * Weather severity classifier
 */
const weatherSeverityClassifier = {
  /**
   * Get current thresholds configuration
   * @returns {Object} Current thresholds
   */
  getThresholds() {
    return { ...currentThresholds };
  },

  /**
   * Update thresholds with custom configuration
   * Performs deep merge with existing thresholds
   *
   * @param {Object} customThresholds - Custom thresholds to apply
   */
  setThresholds(customThresholds) {
    if (!customThresholds || typeof customThresholds !== 'object') {
      throw new Error('Invalid thresholds configuration');
    }

    // Deep merge custom thresholds with current thresholds
    currentThresholds = this._deepMerge(currentThresholds, customThresholds);
  },

  /**
   * Reset thresholds to default values
   */
  resetThresholds() {
    currentThresholds = { ...DEFAULT_THRESHOLDS };
  },

  /**
   * Get weather severity level based on weather data
   *
   * @param {Object} weatherData - Weather data object
   * @returns {Object} Severity assessment with level and warnings
   */
  getSeverity(weatherData) {
    if (!weatherData) return { level: SEVERITY_LEVELS.NONE, warnings: [] };

    const warnings = [];
    let highestSeverity = SEVERITY_LEVELS.NONE;

    // Check weather condition code severity
    const conditionSeverity = this._getConditionSeverity(weatherData);
    if (conditionSeverity.level !== SEVERITY_LEVELS.NONE) {
      warnings.push(conditionSeverity);
      highestSeverity = this._maxSeverity(highestSeverity, conditionSeverity.level);
    }

    // Check temperature severity
    const temperatureSeverity = this._getTemperatureSeverity(weatherData);
    if (temperatureSeverity.level !== SEVERITY_LEVELS.NONE) {
      warnings.push(temperatureSeverity);
      highestSeverity = this._maxSeverity(highestSeverity, temperatureSeverity.level);
    }

    // Check wind severity
    const windSeverity = this._getWindSeverity(weatherData);
    if (windSeverity.level !== SEVERITY_LEVELS.NONE) {
      warnings.push(windSeverity);
      highestSeverity = this._maxSeverity(highestSeverity, windSeverity.level);
    }

    // Check precipitation severity (rain/snow)
    const precipitationSeverity = this._getPrecipitationSeverity(weatherData);
    if (precipitationSeverity.level !== SEVERITY_LEVELS.NONE) {
      warnings.push(precipitationSeverity);
      highestSeverity = this._maxSeverity(highestSeverity, precipitationSeverity.level);
    }

    // Check visibility severity
    const visibilitySeverity = this._getVisibilitySeverity(weatherData);
    if (visibilitySeverity.level !== SEVERITY_LEVELS.NONE) {
      warnings.push(visibilitySeverity);
      highestSeverity = this._maxSeverity(highestSeverity, visibilitySeverity.level);
    }

    return {
      level: highestSeverity,
      warnings
    };
  },

  /**
   * Get severity color based on severity level
   *
   * @param {string} level - Severity level
   * @returns {string} - Color code for the severity level
   */
  getSeverityColor(level) {
    switch (level) {
      case SEVERITY_LEVELS.EXTREME:
        return '#FF0000'; // Red
      case SEVERITY_LEVELS.HIGH:
        return '#FF6600'; // Orange
      case SEVERITY_LEVELS.MODERATE:
        return '#FFCC00'; // Yellow
      case SEVERITY_LEVELS.LOW:
        return '#33CC33'; // Green
      case SEVERITY_LEVELS.NONE:
      default:
        return '#3399FF'; // Blue
    }
  },

  /**
   * Returns a human-readable description of the severity level
   *
   * @param {string} level - Severity level
   * @returns {string} - Human-readable description
   */
  getSeverityDescription(level) {
    switch (level) {
      case SEVERITY_LEVELS.EXTREME:
        return 'Extreme conditions - Avoid travel if possible';
      case SEVERITY_LEVELS.HIGH:
        return 'Hazardous conditions - Exercise caution';
      case SEVERITY_LEVELS.MODERATE:
        return 'Moderate impact - Be prepared';
      case SEVERITY_LEVELS.LOW:
        return 'Minor impact - Be aware';
      case SEVERITY_LEVELS.NONE:
      default:
        return 'No significant impact';
    }
  },

  /**
   * Get severity for weather condition based on code
   * @private
   *
   * @param {Object} weatherData - Weather data
   * @returns {Object} Condition severity assessment
   */
  _getConditionSeverity(weatherData) {
    const weatherId = weatherData.weather?.id;
    const condition = weatherData.weather?.condition?.toLowerCase();

    if (!weatherId || !condition) {
      return { level: SEVERITY_LEVELS.NONE };
    }

    // Get the condition category configuration
    const conditionConfig = currentThresholds.weatherConditions[condition];
    if (!conditionConfig) {
      return { level: SEVERITY_LEVELS.NONE };
    }

    // Check if specific weather code has defined severity
    const level = conditionConfig[weatherId] || conditionConfig.default;

    return {
      level,
      type: 'condition',
      message: `${condition.charAt(0).toUpperCase() + condition.slice(1)} conditions`,
      details: weatherData.weather.description
    };
  },

  /**
   * Get severity for temperature
   * @private
   *
   * @param {Object} weatherData - Weather data
   * @returns {Object} Temperature severity assessment
   */
  _getTemperatureSeverity(weatherData) {
    const temperature = weatherData.measurements?.temperature;

    if (temperature === undefined || temperature === null) {
      return { level: SEVERITY_LEVELS.NONE };
    }

    const { high, extreme, low, extremeLow } = currentThresholds.temperature;

    let level = SEVERITY_LEVELS.NONE;
    let message = '';

    if (temperature >= extreme) {
      level = SEVERITY_LEVELS.EXTREME;
      message = 'Extreme high temperature';
    } else if (temperature >= high) {
      level = SEVERITY_LEVELS.HIGH;
      message = 'High temperature';
    } else if (temperature <= extremeLow) {
      level = SEVERITY_LEVELS.EXTREME;
      message = 'Extreme low temperature';
    } else if (temperature <= low) {
      level = SEVERITY_LEVELS.MODERATE;
      message = 'Low temperature';
    }

    if (level === SEVERITY_LEVELS.NONE) {
      return { level };
    }

    return {
      level,
      type: 'temperature',
      message,
      details: `${temperature}°${currentThresholds.temperature.units === 'celsius' ? 'C' : 'F'}`
    };
  },

  /**
   * Get severity for wind conditions
   * @private
   *
   * @param {Object} weatherData - Weather data
   * @returns {Object} Wind severity assessment
   */
  _getWindSeverity(weatherData) {
    const windSpeed = weatherData.measurements?.windSpeed;

    if (windSpeed === undefined || windSpeed === null) {
      return { level: SEVERITY_LEVELS.NONE };
    }

    const { high, extreme } = currentThresholds.wind;

    let level = SEVERITY_LEVELS.NONE;
    let message = '';

    if (windSpeed >= extreme) {
      level = SEVERITY_LEVELS.EXTREME;
      message = 'Dangerous wind speeds';
    } else if (windSpeed >= high) {
      level = SEVERITY_LEVELS.HIGH;
      message = 'Strong winds';
    }

    if (level === SEVERITY_LEVELS.NONE) {
      return { level };
    }

    return {
      level,
      type: 'wind',
      message,
      details: `${windSpeed} ${currentThresholds.wind.units}`
    };
  },

  /**
   * Get severity for precipitation (rain or snow)
   * @private
   *
   * @param {Object} weatherData - Weather data
   * @returns {Object} Precipitation severity assessment
   */
  _getPrecipitationSeverity(weatherData) {
    const rain = weatherData.measurements?.rain;
    const snow = weatherData.measurements?.snow;

    if ((rain === undefined || rain === 0) && (snow === undefined || snow === 0)) {
      return { level: SEVERITY_LEVELS.NONE };
    }

    let level = SEVERITY_LEVELS.NONE;
    let message = '';
    let details = '';
    let type = '';

    // Check rain severity
    if (rain > 0) {
      const { moderate, heavy, extreme } = currentThresholds.rain;

      if (rain >= extreme) {
        level = SEVERITY_LEVELS.EXTREME;
        message = 'Extreme rainfall';
      } else if (rain >= heavy) {
        level = SEVERITY_LEVELS.HIGH;
        message = 'Heavy rainfall';
      } else if (rain >= moderate) {
        level = SEVERITY_LEVELS.MODERATE;
        message = 'Moderate rainfall';
      } else {
        level = SEVERITY_LEVELS.LOW;
        message = 'Light rainfall';
      }

      type = 'rain';
      details = `${rain} ${currentThresholds.rain.units}/h`;
    }
    // Check snow severity if no rain or snow is more severe
    else if (snow > 0) {
      const { moderate, heavy, extreme } = currentThresholds.snow;

      if (snow >= extreme) {
        level = SEVERITY_LEVELS.EXTREME;
        message = 'Extreme snowfall';
      } else if (snow >= heavy) {
        level = SEVERITY_LEVELS.HIGH;
        message = 'Heavy snowfall';
      } else if (snow >= moderate) {
        level = SEVERITY_LEVELS.MODERATE;
        message = 'Moderate snowfall';
      } else {
        level = SEVERITY_LEVELS.LOW;
        message = 'Light snowfall';
      }

      type = 'snow';
      details = `${snow} ${currentThresholds.snow.units}/h`;
    }

    if (level === SEVERITY_LEVELS.NONE) {
      return { level };
    }

    return {
      level,
      type,
      message,
      details
    };
  },

  /**
   * Get severity for visibility conditions
   * @private
   *
   * @param {Object} weatherData - Weather data
   * @returns {Object} Visibility severity assessment
   */
  _getVisibilitySeverity(weatherData) {
    const visibility = weatherData.measurements?.visibility;

    if (visibility === undefined || visibility === null) {
      return { level: SEVERITY_LEVELS.NONE };
    }

    const { reduced, poor, veryPoor } = currentThresholds.visibility;

    let level = SEVERITY_LEVELS.NONE;
    let message = '';

    if (visibility <= veryPoor) {
      level = SEVERITY_LEVELS.HIGH;
      message = 'Very poor visibility';
    } else if (visibility <= poor) {
      level = SEVERITY_LEVELS.MODERATE;
      message = 'Poor visibility';
    } else if (visibility <= reduced) {
      level = SEVERITY_LEVELS.LOW;
      message = 'Reduced visibility';
    }

    if (level === SEVERITY_LEVELS.NONE) {
      return { level };
    }

    return {
      level,
      type: 'visibility',
      message,
      details: `${visibility} ${currentThresholds.visibility.units}`
    };
  },

  /**
   * Helper to find max severity level between two levels
   * @private
   *
   * @param {string} level1 - First severity level
   * @param {string} level2 - Second severity level
   * @returns {string} - Higher severity level
   */
  _maxSeverity(level1, level2) {
    const severityRank = {
      [SEVERITY_LEVELS.NONE]: 0,
      [SEVERITY_LEVELS.LOW]: 1,
      [SEVERITY_LEVELS.MODERATE]: 2,
      [SEVERITY_LEVELS.HIGH]: 3,
      [SEVERITY_LEVELS.EXTREME]: 4
    };

    return severityRank[level1] >= severityRank[level2] ? level1 : level2;
  },

  /**
   * Helper to deep merge objects
   * @private
   *
   * @param {Object} target - Target object
   * @param {Object} source - Source object to merge in
   * @returns {Object} - Merged object
   */
  _deepMerge(target, source) {
    const output = { ...target };

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

export default weatherSeverityClassifier;