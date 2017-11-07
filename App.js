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



const autocompleteComponent = (placeholder) => {
  return (<GooglePlacesAutocomplete
          placeholder={placeholder}
          minLength={2} // minimum length of text to search
          autoFocus={false}
          fetchDetails={true}
          onPress={(data, details = null) => { // 'details' is provided when fetchDetails = true
          // handle using statekey either starting or ending loc here
            console.log(data);
            console.log(details);
          }}
          getDefaultValue={() => {
            return ''; // text input default value
          }}
          query={{
            // available options: https://developers.google.com/places/web-service/autocomplete
            key: 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA',
            language: 'en', // language of the results
            types: 'address', // default: 'geocode'
          }}
          styles={{
            description: {
              fontWeight: 'bold',
            },
            predefinedPlacesDescription: {
              color: '#1faadb',
            },
          }}

          currentLocation={true} // Will add a 'Current location' button at the top of the predefined places list
          currentLocationLabel="Current location"
          nearbyPlacesAPI='GooglePlacesSearch' // Which API to use: GoogleReverseGeocoding or GooglePlacesSearch
          GoogleReverseGeocodingQuery={{
            // available options for GoogleReverseGeocoding API : https://developers.google.com/maps/documentation/geocoding/intro
          }}
          GooglePlacesSearchQuery={{
            // available options for GooglePlacesSearch API : https://developers.google.com/places/web-service/search
            rankby: 'distance',
          }}
        />)
}


export default class LandingPage extends Component {
  render() {
    return (
      <View style={styles.container}>
      <Text style={styles.welcome}>
        Welcome to Weather Along RizRoute
      </Text>
      <View style={styles.autoContainer}>
        {autocompleteComponent('Starting Location')}

        {autocompleteComponent('Final Destination')}
      </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  autoContainer: {
    alignItems: 'baseline',
    height: '20%',
  },
  textInputContainer: {
    backgroundColor: 'black',
    borderTopWidth: 500,
    borderBottomWidth: 0
  },
  textInput: {

  },
  predefinedPlacesDescription: {
    color: '#1faadb',
  },
});

AppRegistry.registerComponent('WeatherAlongRoute', () => LandingPage);
AppRegistry.registerComponent('autocompleteComponent', (placeholder) => LandingPage);
