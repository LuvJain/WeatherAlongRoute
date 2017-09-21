/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TextInput
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';


export default class LandingPage extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to Weather Along Route
        </Text>
        <TextInput style={styles.instructions}
          placeholder = "Starting Location"
          onChangeText={(startLoc) => this.setState({startLoc})}
        />
        <TextInput style={styles.instructions}
          placeholder = "Final Destination"
          onChangeText={(endLoc) => this.setState({endLoc})}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('test', () => LandingPage);
