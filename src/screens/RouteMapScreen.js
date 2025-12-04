/**
 * RouteMapScreen.js
 * Main screen that integrates route input and map components
 */
import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import MapComponent from '../components/MapComponent';
import RouteInput from '../components/RouteInput';

class RouteMapScreen extends Component {
  constructor(props) {
    super(props);

    this.state = {
      origin: null,
      destination: null,
      route: null,
    };
  }

  // Handle selection of origin and destination
  handleRouteSelect = (origin, destination) => {
    this.setState({
      origin,
      destination,
      route: null // Clear any previous route data
    });
  };

  // Handle route calculation completion
  handleRouteCalculated = (routeData) => {
    this.setState({ route: routeData });
  };

  // Handle route clearing
  handleRouteClear = () => {
    this.setState({
      origin: null,
      destination: null,
      route: null
    });
  };

  // Render route information summary
  renderRouteInfo = () => {
    const { route } = this.state;

    if (!route) {
      return null;
    }

    const leg = route.legs[0];

    return (
      <View style={styles.routeInfoContainer}>
        <Text style={styles.routeInfoTitle}>Route Information</Text>
        <View style={styles.routeInfoRow}>
          <Text style={styles.routeInfoLabel}>Distance:</Text>
          <Text style={styles.routeInfoValue}>{leg.distance.text}</Text>
        </View>
        <View style={styles.routeInfoRow}>
          <Text style={styles.routeInfoLabel}>Duration:</Text>
          <Text style={styles.routeInfoValue}>{leg.duration.text}</Text>
        </View>
        <View style={styles.routeInfoRow}>
          <Text style={styles.routeInfoLabel}>Start:</Text>
          <Text style={styles.routeInfoValue}>{leg.start_address}</Text>
        </View>
        <View style={styles.routeInfoRow}>
          <Text style={styles.routeInfoLabel}>End:</Text>
          <Text style={styles.routeInfoValue}>{leg.end_address}</Text>
        </View>
      </View>
    );
  };

  render() {
    const { origin, destination, route } = this.state;

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Weather Along Route</Text>
          </View>

          <View style={styles.mapContainer}>
            <MapComponent
              origin={origin}
              destination={destination}
              onRouteCalculated={this.handleRouteCalculated}
            />
          </View>

          <ScrollView
            style={styles.inputScrollView}
            keyboardShouldPersistTaps="handled"
          >
            <RouteInput
              onRouteSelect={this.handleRouteSelect}
              onRouteClear={this.handleRouteClear}
            />

            {this.renderRouteInfo()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a73e8',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
  },
  inputScrollView: {
    maxHeight: 350,
    backgroundColor: 'transparent',
  },
  routeInfoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginTop: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  routeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeInfoLabel: {
    flex: 1,
    fontWeight: 'bold',
    color: '#555',
  },
  routeInfoValue: {
    flex: 3,
    color: '#333',
  },
});

export default RouteMapScreen;