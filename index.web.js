/**
 * Web entry point for WeatherAlongRoute application
 * This file configures React Native Web for browser rendering
 */

import { AppRegistry } from 'react-native';
import LandingPage from './App';

// Register the app
AppRegistry.registerComponent('WeatherAlongRoute', () => LandingPage);

// Web-specific setup
AppRegistry.runApplication('WeatherAlongRoute', {
  rootTag: document.getElementById('root')
});