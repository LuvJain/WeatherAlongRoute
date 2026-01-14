/**
 * Map Container Component
 * Main map component that displays the route with weather overlays
 * Uses Leaflet.js for mapping functionality
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { SEVERITY_LEVELS } from '../../utils/weatherSeverity';

/**
 * Generate HTML content for Leaflet map
 *
 * @param {Array} segments - Route segments with weather data
 * @param {boolean} showWeatherOverlay - Whether to show weather overlay
 * @returns {string} - HTML content for WebView
 */
const generateMapHTML = (segments, showWeatherOverlay = true) => {
  // Filter out segments without weather data
  const validSegments = segments.filter(segment =>
    segment && segment.startPoint && segment.endPoint && segment.weatherAvailable
  );

  if (!validSegments.length) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; }
          .map-error { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
        </style>
      </head>
      <body>
        <div class="map-error">No valid route segments found.</div>
      </body>
      </html>
    `;
  }

  // Calculate map bounds from segments
  const coordinates = validSegments.flatMap(segment => [
    [segment.startPoint.latitude, segment.startPoint.longitude],
    [segment.endPoint.latitude, segment.endPoint.longitude]
  ]);

  // Generate polyline coordinates and colors for each segment
  const segmentLines = validSegments.map((segment, index) => {
    const color = getSeverityColor(segment.severity);
    return `
      L.polyline([
        [${segment.startPoint.latitude}, ${segment.startPoint.longitude}],
        [${segment.endPoint.latitude}, ${segment.endPoint.longitude}]
      ], {
        color: '${color}',
        weight: 5,
        opacity: 0.8,
        segmentId: ${index}
      }).addTo(map).on('click', function(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SEGMENT_CLICK',
          segmentId: ${index}
        }));
      });
    `;
  }).join('\n');

  // Generate markers for each segment with weather information
  const weatherMarkers = showWeatherOverlay ? validSegments.map((segment, index) => {
    const { weather } = segment;
    const midLat = (segment.startPoint.latitude + segment.endPoint.latitude) / 2;
    const midLng = (segment.startPoint.longitude + segment.endPoint.longitude) / 2;

    return `
      // Weather marker for segment ${index}
      L.marker([${midLat}, ${midLng}], {
        icon: L.divIcon({
          html: '<div class="weather-icon" style="background-image: url(http://openweathermap.org/img/w/${weather.weather.icon}.png)"></div>',
          className: 'weather-icon-container',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        }),
        segmentId: ${index}
      }).addTo(map).on('click', function(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WEATHER_CLICK',
          segmentId: ${index}
        }));
      });
    `;
  }).join('\n') : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; }
        .weather-icon-container { background: none; border: none; }
        .weather-icon {
          width: 40px;
          height: 40px;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          filter: drop-shadow(0px 0px 2px rgba(0,0,0,0.5));
        }
        .route-info-box {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: white;
          padding: 10px;
          border-radius: 4px;
          box-shadow: 0 1px 5px rgba(0,0,0,0.4);
          z-index: 1000;
          font-size: 14px;
          max-width: 200px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Initialize map
        const map = L.map('map', {
          zoomControl: true,
          attributionControl: false
        });

        // Add base map layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // Set view to cover all segments
        const bounds = L.latLngBounds(${JSON.stringify(coordinates)});
        map.fitBounds(bounds, { padding: [30, 30] });

        // Add route segments
        ${segmentLines}

        // Add weather markers
        ${weatherMarkers}

        // Listen for map clicks
        map.on('click', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_CLICK',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }));
        });

        // Notify React Native when map is ready
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'MAP_READY'
        }));
      </script>
    </body>
    </html>
  `;
};

/**
 * Get color for a severity level
 *
 * @param {string} severity - Severity level
 * @returns {string} - Color hex code
 */
const getSeverityColor = (severity) => {
  switch (severity) {
    case SEVERITY_LEVELS.EXTREME:
      return '#FF0000'; // Red
    case SEVERITY_LEVELS.HIGH:
      return '#FF6600'; // Orange
    case SEVERITY_LEVELS.MODERATE:
      return '#FFCC00'; // Yellow
    case SEVERITY_LEVELS.LOW:
      return '#33CC33'; // Green
    default:
      return '#3399FF'; // Blue
  }
};

/**
 * MapContainer component - Displays route on a Leaflet map
 *
 * @param {object} props - Component props
 * @param {object} props.routeWeather - Route weather data
 * @param {function} props.onSegmentSelect - Callback when segment is selected
 * @param {boolean} props.showWeatherOverlay - Whether to show weather overlay
 * @returns {JSX.Element}
 */
const MapContainer = ({
  routeWeather,
  onSegmentSelect,
  showWeatherOverlay = true,
  style = {}
}) => {
  const webViewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);

  if (!routeWeather || !routeWeather.segments) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading route data...</Text>
      </View>
    );
  }

  const { segments } = routeWeather;

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'MAP_READY':
          setMapReady(true);
          break;
        case 'SEGMENT_CLICK':
        case 'WEATHER_CLICK':
          const segmentId = data.segmentId;
          setSelectedSegmentId(segmentId);

          if (onSegmentSelect && segments[segmentId]) {
            onSegmentSelect(segments[segmentId], segmentId);
          }
          break;
        case 'MAP_CLICK':
          // Handle general map clicks
          setSelectedSegmentId(null);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Handle WebView errors
  const handleWebViewError = (error) => {
    setMapError('Error loading map: ' + error.description);
  };

  const html = generateMapHTML(segments, showWeatherOverlay);

  return (
    <View style={[styles.container, style]}>
      {mapError ? (
        <Text style={styles.errorText}>{mapError}</Text>
      ) : (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          onError={handleWebViewError}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
        />
      )}

      {/* Map controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            webViewRef.current?.injectJavaScript(`
              map.zoomIn();
              true;
            `);
          }}
        >
          <Text style={styles.controlButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            webViewRef.current?.injectJavaScript(`
              map.zoomOut();
              true;
            `);
          }}
        >
          <Text style={styles.controlButtonText}>-</Text>
        </TouchableOpacity>
      </View>

      {/* Selected segment info */}
      {selectedSegmentId !== null && segments[selectedSegmentId] && (
        <View style={styles.segmentInfo}>
          <Text style={styles.segmentInfoTitle}>
            Segment {selectedSegmentId + 1}
          </Text>
          <Text style={styles.segmentInfoText}>
            {segments[selectedSegmentId].weather?.weather.condition},
            {segments[selectedSegmentId].weather?.measurements.temperature}°
            {routeWeather.routeOverview.units === 'metric' ? 'C' : 'F'}
          </Text>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => {
              if (onSegmentSelect) {
                onSegmentSelect(segments[selectedSegmentId], selectedSegmentId);
              }
            }}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    padding: 20,
    color: 'red',
    textAlign: 'center',
  },
  mapControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  controlButton: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  controlButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  segmentInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  segmentInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  detailsButton: {
    backgroundColor: '#0066cc',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default MapContainer;