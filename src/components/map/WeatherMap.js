/**
 * Weather Map Component
 * Main component that combines the map with weather visualization
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import MapContainer from './MapContainer';
import { WeatherLegend, WeatherToggle, WeatherConditions } from './WeatherOverlay';
import SegmentDetails from './SegmentDetails';

/**
 * WeatherMap component - Main weather map visualization
 *
 * @param {object} props - Component props
 * @param {object} props.routeWeather - Route weather data
 * @param {function} props.onUpdate - Callback when data is updated
 * @param {boolean} props.isRealTime - Whether to use real-time updates
 * @returns {JSX.Element}
 */
const WeatherMap = ({ routeWeather, onUpdate, isRealTime = false }) => {
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [isPortrait, setIsPortrait] = useState(
    Dimensions.get('window').height > Dimensions.get('window').width
  );

  // Update orientation when dimensions change
  useEffect(() => {
    const handleOrientationChange = () => {
      setIsPortrait(Dimensions.get('window').height > Dimensions.get('window').width);
    };

    Dimensions.addEventListener('change', handleOrientationChange);

    return () => {
      // For React Native versions where you need to remove the listener
      if (Dimensions.removeEventListener) {
        Dimensions.removeEventListener('change', handleOrientationChange);
      }
    };
  }, []);

  // Handle segment selection
  const handleSegmentSelect = (segment, segmentId) => {
    setSelectedSegment(segment);
    setSelectedSegmentId(segmentId);
  };

  // Clear segment selection
  const handleClearSelection = () => {
    setSelectedSegment(null);
    setSelectedSegmentId(null);
  };

  // Toggle weather overlay display
  const toggleWeatherOverlay = () => {
    setShowWeatherOverlay(!showWeatherOverlay);
  };

  if (!routeWeather) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      isPortrait ? styles.portraitContainer : styles.landscapeContainer
    ]}>
      {/* Map container */}
      <View style={[
        styles.mapContainer,
        isPortrait ? styles.portraitMapContainer : styles.landscapeMapContainer
      ]}>
        <MapContainer
          routeWeather={routeWeather}
          onSegmentSelect={handleSegmentSelect}
          showWeatherOverlay={showWeatherOverlay}
        />

        {/* Weather controls */}
        <WeatherToggle
          showWeather={showWeatherOverlay}
          onToggle={toggleWeatherOverlay}
        />

        {/* Weather legend */}
        <WeatherLegend visible={showLegend} />

        {/* Current weather conditions when a segment is selected */}
        {selectedSegment && selectedSegment.weatherAvailable && (
          <WeatherConditions
            weatherData={selectedSegment.weather}
            units={routeWeather.routeOverview.units}
          />
        )}
      </View>

      {/* Detailed segment info section */}
      {isPortrait ? (
        <View style={styles.detailsContainerPortrait}>
          {selectedSegment && (
            <SegmentDetails
              segment={selectedSegment}
              segmentId={selectedSegmentId}
              units={routeWeather.routeOverview.units}
              onClose={handleClearSelection}
              isRealTime={isRealTime}
            />
          )}
        </View>
      ) : (
        <View style={styles.detailsContainerLandscape}>
          <ScrollView>
            {selectedSegment && (
              <SegmentDetails
                segment={selectedSegment}
                segmentId={selectedSegmentId}
                units={routeWeather.routeOverview.units}
                onClose={handleClearSelection}
                isRealTime={isRealTime}
                isLandscape={true}
              />
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  portraitContainer: {
    flexDirection: 'column',
  },
  landscapeContainer: {
    flexDirection: 'row',
  },
  mapContainer: {
    position: 'relative',
  },
  portraitMapContainer: {
    height: Dimensions.get('window').height * 0.65,
    width: '100%',
  },
  landscapeMapContainer: {
    height: '100%',
    width: Dimensions.get('window').width * 0.65,
  },
  detailsContainerPortrait: {
    flex: 1,
    width: '100%',
  },
  detailsContainerLandscape: {
    flex: 1,
    height: '100%',
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
    backgroundColor: 'white',
  },
});

export default WeatherMap;