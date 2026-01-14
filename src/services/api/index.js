/**
 * API Services Index
 * Exports all API services for easy importing
 */

import openWeatherMapService from './openWeatherMap';

export {
  openWeatherMapService
};

// Export default API map
export default {
  openWeatherMap: openWeatherMapService
};