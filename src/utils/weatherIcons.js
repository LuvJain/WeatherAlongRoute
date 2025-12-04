/**
 * Weather Icons Utility - Maps OpenWeatherMap condition codes to icon names
 */

// Map OpenWeatherMap condition codes to descriptive names
// These can be used with any icon library (we'll use emoji for simplicity)
export const getIconNameForCondition = (conditionId) => {
  // Thunderstorm
  if (conditionId >= 200 && conditionId < 300) {
    return 'thunderstorm';
  }
  // Drizzle
  else if (conditionId >= 300 && conditionId < 400) {
    return 'drizzle';
  }
  // Rain
  else if (conditionId >= 500 && conditionId < 600) {
    return 'rain';
  }
  // Snow
  else if (conditionId >= 600 && conditionId < 700) {
    return 'snow';
  }
  // Atmosphere (fog, mist, etc.)
  else if (conditionId >= 700 && conditionId < 800) {
    return 'fog';
  }
  // Clear
  else if (conditionId === 800) {
    return 'clear';
  }
  // Clouds
  else if (conditionId > 800 && conditionId < 900) {
    return 'clouds';
  }
  // Default
  return 'unknown';
};

// Map condition names to emoji (for simplicity)
// In a real app, you'd use actual icon assets or an icon library
export const getIconForCondition = (conditionId) => {
  const iconName = getIconNameForCondition(conditionId);

  switch (iconName) {
    case 'thunderstorm':
      return '⛈️';
    case 'drizzle':
      return '🌦️';
    case 'rain':
      return '🌧️';
    case 'snow':
      return '❄️';
    case 'fog':
      return '🌫️';
    case 'clear':
      return '☀️';
    case 'clouds':
      return '☁️';
    default:
      return '❓';
  }
};

// Get a background color based on temperature
export const getColorForTemperature = (tempCelsius) => {
  // Cold (below freezing)
  if (tempCelsius <= 0) {
    return '#A4D3EE'; // Light blue
  }
  // Cool (0-10°C)
  else if (tempCelsius <= 10) {
    return '#87CEFA'; // Light sky blue
  }
  // Mild (10-18°C)
  else if (tempCelsius <= 18) {
    return '#90EE90'; // Light green
  }
  // Warm (18-25°C)
  else if (tempCelsius <= 25) {
    return '#FFFF99'; // Light yellow
  }
  // Hot (25-30°C)
  else if (tempCelsius <= 30) {
    return '#FFA07A'; // Light salmon
  }
  // Very hot (above 30°C)
  else {
    return '#FF6347'; // Tomato
  }
};