// @flow

import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import LocationInput from './LocationInput';
import type { Location } from '../models/Location';

type Props = {
  googleApiKey: string;
  onLocationSelect?: (location: Location) => void;
  placeholder?: string;
  style?: any;
};

type State = {
  selectedLocation: ?Location;
};

/**
 * Container component that wraps LocationInput and manages location selection state
 * Can be used to integrate LocationInput into any screen in the app
 */
export class LocationInputContainer extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedLocation: null,
    };
  }

  /**
   * Handle location selection from LocationInput component
   */
  handleLocationSelect = (location: Location) => {
    this.setState({ selectedLocation: location });

    // Call parent callback if provided
    if (this.props.onLocationSelect) {
      this.props.onLocationSelect(location);
    }
  };

  /**
   * Get the currently selected location
   */
  getSelectedLocation = (): ?Location => {
    return this.state.selectedLocation;
  };

  /**
   * Clear the selected location
   */
  clearSelectedLocation = () => {
    this.setState({ selectedLocation: null });
  };

  render() {
    const { googleApiKey, placeholder, style } = this.props;

    return (
      <View style={[styles.container, style]}>
        <LocationInput
          onLocationSelect={this.handleLocationSelect}
          googleApiKey={googleApiKey}
          placeholder={placeholder}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default LocationInputContainer;
