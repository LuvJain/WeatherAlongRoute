/**
 * Weather Along Route App
 * Route input interface with map integration
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import RouteInput from './src/components/RouteInput';

export default class WeatherAlongRoute extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedRoute: null,
    };
  }

  handleRouteSelected = (routeData) => {
    this.setState({ selectedRoute: routeData });
    console.log('Route selected:', routeData);

    // Here you would typically fetch weather data along the route
    // or navigate to a details screen
  }

  render() {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5FCFF" />

        <View style={styles.headerContainer}>
          <Text style={styles.welcome}>
            Weather Along Route
          </Text>
          <Text style={styles.subtitle}>
            Plan your journey with weather insights
          </Text>
        </View>

        <RouteInput onRouteSelected={this.handleRouteSelected} />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

// Register the app component
AppRegistry.registerComponent('WeatherAlongRoute', () => WeatherAlongRoute);
AppRegistry.registerComponent('test', () => WeatherAlongRoute);
