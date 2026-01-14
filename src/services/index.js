/**
 * Services Index
 * Exports all services for easy importing
 */

import weatherService from './weatherService';
import apiServices from './api';

export {
  weatherService,
  apiServices
};

export default {
  weather: weatherService,
  api: apiServices
};