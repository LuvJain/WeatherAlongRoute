/**
 * Weather Dashboard App
 * React Native App with OpenWeatherMap API integration
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import WeatherDashboard from './src/components/WeatherDashboard';

// Get device dimensions for responsive design
const { width, height } = Dimensions.get('window');
const isTablet = width > 600; // Simple tablet detection

export default class WeatherApp extends Component {
  render() {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <WeatherDashboard />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  }
});

AppRegistry.registerComponent('WeatherApp', () => WeatherApp);
