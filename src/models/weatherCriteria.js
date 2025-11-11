/**
 * Weather Criteria Model
 * Defines the structure for driver-specific weather thresholds
 */

// Default weather threshold values
export const DEFAULT_WEATHER_CRITERIA = {
  // Temperature thresholds (in Celsius)
  temperature: {
    min: -10,    // Minimum acceptable temperature
    max: 40,     // Maximum acceptable temperature
    preferred: 20, // Preferred temperature
  },

  // Wind speed thresholds (in km/h)
  windSpeed: {
    max: 50,     // Maximum acceptable wind speed
    preferred: 10, // Preferred wind speed
  },

  // Precipitation thresholds (in mm per hour)
  precipitation: {
    max: 10,     // Maximum acceptable precipitation rate
    preferred: 0, // Preferred precipitation rate
  },

  // Visibility thresholds (in km)
  visibility: {
    min: 0.5,    // Minimum acceptable visibility
    preferred: 10, // Preferred visibility
  },

  // Snow accumulation (in cm)
  snowAccumulation: {
    max: 5,      // Maximum acceptable snow accumulation
    preferred: 0, // Preferred snow accumulation
  },

  // Ice conditions (boolean)
  iceConditions: false,  // Whether to allow driving in icy conditions

  // Weather condition preferences (array of allowed conditions)
  allowedConditions: [
    'clear',
    'clouds',
    'partlyCloudy',
    'overcast',
  ],

  // Disallowed conditions (array of disallowed conditions)
  disallowedConditions: [
    'thunderstorm',
    'tornado',
    'hurricane',
  ]
};

// Valid value ranges for each parameter (for validation)
export const WEATHER_CRITERIA_RANGES = {
  temperature: {
    min: { min: -50, max: 0 },
    max: { min: 20, max: 50 },
    preferred: { min: -10, max: 40 }
  },
  windSpeed: {
    max: { min: 20, max: 120 },
    preferred: { min: 0, max: 50 }
  },
  precipitation: {
    max: { min: 0, max: 50 },
    preferred: { min: 0, max: 20 }
  },
  visibility: {
    min: { min: 0.1, max: 2 },
    preferred: { min: 1, max: 20 }
  },
  snowAccumulation: {
    max: { min: 0, max: 30 },
    preferred: { min: 0, max: 10 }
  }
};

// Available weather conditions for selection
export const AVAILABLE_WEATHER_CONDITIONS = [
  { id: 'clear', label: 'Clear Sky', icon: 'sun' },
  { id: 'clouds', label: 'Cloudy', icon: 'cloud' },
  { id: 'partlyCloudy', label: 'Partly Cloudy', icon: 'cloud-sun' },
  { id: 'overcast', label: 'Overcast', icon: 'clouds' },
  { id: 'fog', label: 'Fog', icon: 'fog' },
  { id: 'drizzle', label: 'Light Rain', icon: 'cloud-drizzle' },
  { id: 'rain', label: 'Rain', icon: 'cloud-rain' },
  { id: 'heavyRain', label: 'Heavy Rain', icon: 'cloud-showers-heavy' },
  { id: 'thunderstorm', label: 'Thunderstorm', icon: 'bolt' },
  { id: 'snow', label: 'Snow', icon: 'snowflake' },
  { id: 'sleet', label: 'Sleet', icon: 'cloud-sleet' },
  { id: 'hail', label: 'Hail', icon: 'cloud-hail' },
  { id: 'tornado', label: 'Tornado', icon: 'tornado' },
  { id: 'hurricane', label: 'Hurricane', icon: 'hurricane' }
];

// Validation functions for weather criteria
export const validateCriteria = (criteria) => {
  const errors = {};

  // Validate temperature
  if (criteria.temperature.min > criteria.temperature.max) {
    errors.temperature = 'Minimum temperature cannot be greater than maximum temperature';
  }

  if (criteria.temperature.preferred < criteria.temperature.min ||
      criteria.temperature.preferred > criteria.temperature.max) {
    errors.temperaturePreferred = 'Preferred temperature must be within min and max range';
  }

  // Validate ranges for each parameter
  Object.keys(WEATHER_CRITERIA_RANGES).forEach(param => {
    if (criteria[param]) {
      Object.keys(WEATHER_CRITERIA_RANGES[param]).forEach(subParam => {
        if (criteria[param][subParam] !== undefined) {
          const range = WEATHER_CRITERIA_RANGES[param][subParam];
          if (criteria[param][subParam] < range.min || criteria[param][subParam] > range.max) {
            errors[`${param}_${subParam}`] = `${param} ${subParam} must be between ${range.min} and ${range.max}`;
          }
        }
      });
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Create a new criteria set based on defaults
export const createDefaultCriteria = (driverId) => {
  return {
    ...DEFAULT_WEATHER_CRITERIA,
    driverId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};