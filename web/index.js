import React from 'react';
import { AppRegistry } from 'react-native';
import App from '../App';

// Register the app with the same name as in the mobile entry points
AppRegistry.registerComponent('WeatherAlongRoute', () => App);

// Initialize the app with the DOM render function
AppRegistry.runApplication('WeatherAlongRoute', {
  rootTag: document.getElementById('root')
});