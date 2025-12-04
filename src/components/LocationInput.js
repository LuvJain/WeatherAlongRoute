import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const GOOGLE_MAPS_API_KEY = 'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA';

const LocationInput = ({ placeholder, onLocationSelected, defaultValue = '', currentLocationLabel = "Current location" }) => {
  const autocompleteRef = useRef(null);

  const validateLocation = (data, details) => {
    // Ensure we have the required data for a valid location
    if (!details || !details.geometry || !details.geometry.location) {
      console.warn('Invalid location data received');
      return false;
    }
    return true;
  };

  const handleLocationSelect = (data, details = null) => {
    // Validate location data before processing
    if (!validateLocation(data, details)) return;

    // Format the location data for the parent component
    const formattedLocation = {
      latitude: details.geometry.location.lat,
      longitude: details.geometry.location.lng,
      description: data.description || details.formatted_address,
      placeId: data.place_id,
      details: details, // Keep full details for potential future use
    };

    // Pass formatted data to parent component
    onLocationSelected(formattedLocation);
  };

  const clearInput = () => {
    if (autocompleteRef && autocompleteRef.current) {
      autocompleteRef.current.clear();
    }
  };

  return (
    <View style={styles.container}>
      <GooglePlacesAutocomplete
        ref={autocompleteRef}
        placeholder={placeholder}
        minLength={2}
        autoFocus={false}
        returnKeyType={'search'}
        listViewDisplayed={false}
        fetchDetails={true}
        renderDescription={row => row.description}
        enablePoweredByContainer={false}
        onPress={handleLocationSelect}
        getDefaultValue={() => defaultValue}
        query={{
          key: GOOGLE_MAPS_API_KEY,
          language: 'en',
          types: 'geocode',
        }}
        styles={{
          container: styles.autocompleteContainer,
          textInputContainer: styles.textInputContainer,
          textInput: styles.textInput,
          description: styles.description,
          predefinedPlacesDescription: styles.predefinedPlacesDescription,
          listView: styles.listView,
          row: styles.row,
        }}
        currentLocation={true}
        currentLocationLabel={currentLocationLabel}
        nearbyPlacesAPI="GooglePlacesSearch"
        GoogleReverseGeocodingQuery={{}}
        GooglePlacesSearchQuery={{
          rankby: 'distance',
        }}
        filterReverseGeocodingByTypes={['locality', 'administrative_area_level_3']}
        debounce={200}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 1,
  },
  autocompleteContainer: {
    flex: 0,
    width: '100%',
    marginVertical: 5,
  },
  textInputContainer: {
    backgroundColor: 'rgba(0,0,0,0)',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 5,
  },
  textInput: {
    marginLeft: 0,
    marginRight: 0,
    height: 45,
    color: '#5d5d5d',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingLeft: 10,
  },
  description: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  predefinedPlacesDescription: {
    color: '#1faadb',
  },
  listView: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginHorizontal: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { x: 0, y: 0 },
    shadowRadius: 15,
    marginTop: 5,
  },
  row: {
    padding: 13,
    height: 'auto',
    flexDirection: 'row',
  },
});

export default LocationInput;