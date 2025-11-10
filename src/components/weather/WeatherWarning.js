/**
 * Weather Warning Component
 * Displays a weather warning with severity information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SEVERITY_LEVELS } from '../../utils/weatherSeverity';

/**
 * Weather Warning component
 *
 * @param {object} props - Component props
 * @param {object} props.warning - Warning data
 * @param {string} props.warning.severity - Severity level
 * @param {string} props.warning.message - Warning message
 * @param {string} props.warning.color - Color code for warning
 * @param {string} props.warning.description - Detailed description
 * @param {boolean} props.expanded - Whether to show details
 * @param {function} props.onPress - Function to call when warning is pressed
 * @returns {JSX.Element}
 */
const WeatherWarning = ({ warning, expanded = false, onPress }) => {
  if (!warning) return null;

  const { severity, message, color, description } = warning;

  // Default color for NONE severity
  const displayColor = color || '#3399FF';

  // Custom styling based on severity level
  const containerStyle = {
    ...styles.container,
    borderColor: displayColor,
    backgroundColor: `${displayColor}20`, // 20% opacity version of the color
  };

  const iconStyle = {
    ...styles.severityIcon,
    backgroundColor: displayColor,
  };

  return (
    <View style={containerStyle}>
      <View style={styles.header}>
        <View style={iconStyle}>
          <Text style={styles.severityIconText}>
            {severity === SEVERITY_LEVELS.EXTREME ? '!' :
             severity === SEVERITY_LEVELS.HIGH ? '!' :
             severity === SEVERITY_LEVELS.MODERATE ? '•' : 'i'}
          </Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>

      {expanded && (
        <View style={styles.details}>
          <Text style={styles.description}>{description}</Text>
          {warning.details && warning.details.map((detail, index) => (
            <Text key={index} style={styles.detailText}>
              • {detail.message} {detail.details ? `(${detail.details})` : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  severityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  severityIconText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  details: {
    padding: 12,
    paddingTop: 0,
  },
  description: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginTop: 4,
  },
});

export default WeatherWarning;