/**
 * Weather Criteria Form
 * Form component for configuring personalized bad weather criteria
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  TextInput,
  Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  getDriverCriteria,
  saveDriverCriteria,
  resetDriverCriteria
} from '../../services/weatherCriteriaService';
import {
  WEATHER_CRITERIA_RANGES,
  AVAILABLE_WEATHER_CONDITIONS,
  validateCriteria
} from '../../models/weatherCriteria';

// Slider component that works on both web and native
const Slider = Platform.select({
  web: ({ value, onValueChange, minimumValue, maximumValue, step }) => (
    <input
      type="range"
      value={value}
      min={minimumValue}
      max={maximumValue}
      step={step || 1}
      onChange={e => onValueChange(parseFloat(e.target.value))}
      style={{ width: '100%', height: 40 }}
    />
  ),
  default: require('react-native').Slider
});

// Parameter configuration component
const ParameterConfig = ({ title, param, value, onChange, ranges, validationErrors }) => {
  // Get validation errors for this parameter
  const getErrorsForParam = () => {
    return Object.keys(validationErrors || {})
      .filter(key => key.startsWith(param))
      .map(key => validationErrors[key]);
  };

  const errors = getErrorsForParam();
  const hasError = errors.length > 0;

  return (
    <View style={[styles.parameterContainer, hasError && styles.errorContainer]}>
      <Text style={styles.parameterTitle}>{title}</Text>

      {/* Min value slider (if applicable) */}
      {ranges[param].min && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            Minimum: <Text style={styles.valueText}>{value.min}</Text>
          </Text>
          <Slider
            minimumValue={ranges[param].min.min}
            maximumValue={ranges[param].min.max}
            step={0.1}
            value={value.min}
            onValueChange={(newValue) => onChange({ ...value, min: newValue })}
            minimumTrackTintColor="#3498db"
            maximumTrackTintColor="#bdc3c7"
            thumbTintColor="#2980b9"
            style={styles.slider}
          />
        </View>
      )}

      {/* Max value slider (if applicable) */}
      {ranges[param].max && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            Maximum: <Text style={styles.valueText}>{value.max}</Text>
          </Text>
          <Slider
            minimumValue={ranges[param].max.min}
            maximumValue={ranges[param].max.max}
            step={0.1}
            value={value.max}
            onValueChange={(newValue) => onChange({ ...value, max: newValue })}
            minimumTrackTintColor="#3498db"
            maximumTrackTintColor="#bdc3c7"
            thumbTintColor="#2980b9"
            style={styles.slider}
          />
        </View>
      )}

      {/* Preferred value slider (if applicable) */}
      {ranges[param].preferred && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            Preferred: <Text style={styles.valueText}>{value.preferred}</Text>
          </Text>
          <Slider
            minimumValue={ranges[param].preferred.min}
            maximumValue={ranges[param].preferred.max}
            step={0.1}
            value={value.preferred}
            onValueChange={(newValue) => onChange({ ...value, preferred: newValue })}
            minimumTrackTintColor="#2ecc71"
            maximumTrackTintColor="#bdc3c7"
            thumbTintColor="#27ae60"
            style={styles.slider}
          />
        </View>
      )}

      {/* Display validation errors */}
      {hasError && (
        <View style={styles.errorMessageContainer}>
          {errors.map((error, index) => (
            <Text key={index} style={styles.errorMessage}>{error}</Text>
          ))}
        </View>
      )}
    </View>
  );
};

// Weather condition selector component
const WeatherConditionSelector = ({ title, conditions, selected, onChange }) => {
  return (
    <View style={styles.conditionSelectorContainer}>
      <Text style={styles.parameterTitle}>{title}</Text>
      <View style={styles.conditionsGrid}>
        {conditions.map((condition) => {
          const isSelected = selected.includes(condition.id);
          return (
            <TouchableOpacity
              key={condition.id}
              style={[
                styles.conditionItem,
                isSelected && styles.selectedCondition
              ]}
              onPress={() => {
                if (isSelected) {
                  onChange(selected.filter(id => id !== condition.id));
                } else {
                  onChange([...selected, condition.id]);
                }
              }}
            >
              <Text style={[styles.conditionText, isSelected && styles.selectedConditionText]}>
                {condition.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Main weather criteria form component
const WeatherCriteriaForm = () => {
  const { currentUser } = useAuth();
  const [criteria, setCriteria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Load criteria on component mount
  useEffect(() => {
    const loadCriteria = async () => {
      if (!currentUser) return;

      try {
        const driverCriteria = await getDriverCriteria(currentUser.id);
        setCriteria(driverCriteria);
        setValidationErrors({});
      } catch (error) {
        setFeedback({
          type: 'error',
          message: 'Failed to load your weather criteria. Please try again.'
        });
      } finally {
        setLoading(false);
      }
    };

    loadCriteria();
  }, [currentUser]);

  // Handle form submission
  const handleSave = async () => {
    // Validate criteria before saving
    const validation = validateCriteria(criteria);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setFeedback({
        type: 'error',
        message: 'Please fix the validation errors before saving.'
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await saveDriverCriteria(currentUser.id, criteria);
      setIsDirty(false);
      setFeedback({
        type: 'success',
        message: 'Weather criteria saved successfully!'
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: 'Failed to save criteria. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle form reset
  const handleReset = async () => {
    setFeedback(null);
    setLoading(true);

    try {
      const defaultCriteria = await resetDriverCriteria(currentUser.id);
      setCriteria(defaultCriteria);
      setIsDirty(false);
      setValidationErrors({});
      setFeedback({
        type: 'success',
        message: 'Weather criteria reset to default values.'
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: 'Failed to reset criteria. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Update a specific parameter
  const updateParameter = (param, value) => {
    setCriteria(prevCriteria => ({
      ...prevCriteria,
      [param]: value
    }));
    setIsDirty(true);

    // Validate after update
    const updatedCriteria = {
      ...criteria,
      [param]: value
    };

    const validation = validateCriteria(updatedCriteria);
    setValidationErrors(validation.errors);
  };

  // Show loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading weather preferences...</Text>
      </View>
    );
  }

  // If no user is logged in, show a message
  if (!currentUser) {
    return (
      <View style={styles.noUserContainer}>
        <Text style={styles.noUserText}>
          Please log in to configure your weather preferences.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Personalized Weather Criteria</Text>
        <Text style={styles.subheaderText}>
          Configure your driving preferences for different weather conditions
        </Text>
      </View>

      {/* Feedback messages */}
      {feedback && (
        <View style={[
          styles.feedbackContainer,
          feedback.type === 'success' ? styles.successFeedback : styles.errorFeedback
        ]}>
          <Text style={styles.feedbackText}>{feedback.message}</Text>
        </View>
      )}

      {/* Temperature configuration */}
      <ParameterConfig
        title="Temperature (°C)"
        param="temperature"
        value={criteria.temperature}
        onChange={(value) => updateParameter('temperature', value)}
        ranges={WEATHER_CRITERIA_RANGES}
        validationErrors={validationErrors}
      />

      {/* Wind speed configuration */}
      <ParameterConfig
        title="Wind Speed (km/h)"
        param="windSpeed"
        value={criteria.windSpeed}
        onChange={(value) => updateParameter('windSpeed', value)}
        ranges={WEATHER_CRITERIA_RANGES}
        validationErrors={validationErrors}
      />

      {/* Precipitation configuration */}
      <ParameterConfig
        title="Precipitation (mm/h)"
        param="precipitation"
        value={criteria.precipitation}
        onChange={(value) => updateParameter('precipitation', value)}
        ranges={WEATHER_CRITERIA_RANGES}
        validationErrors={validationErrors}
      />

      {/* Visibility configuration */}
      <ParameterConfig
        title="Visibility (km)"
        param="visibility"
        value={criteria.visibility}
        onChange={(value) => updateParameter('visibility', value)}
        ranges={WEATHER_CRITERIA_RANGES}
        validationErrors={validationErrors}
      />

      {/* Snow accumulation configuration */}
      <ParameterConfig
        title="Snow Accumulation (cm)"
        param="snowAccumulation"
        value={criteria.snowAccumulation}
        onChange={(value) => updateParameter('snowAccumulation', value)}
        ranges={WEATHER_CRITERIA_RANGES}
        validationErrors={validationErrors}
      />

      {/* Ice conditions toggle */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Allow Driving in Icy Conditions</Text>
        <Switch
          value={criteria.iceConditions}
          onValueChange={(value) => updateParameter('iceConditions', value)}
          trackColor={{ false: '#bdc3c7', true: '#3498db' }}
          thumbColor={criteria.iceConditions ? '#2980b9' : '#95a5a6'}
        />
      </View>

      {/* Allowed weather conditions */}
      <WeatherConditionSelector
        title="Allowed Weather Conditions"
        conditions={AVAILABLE_WEATHER_CONDITIONS}
        selected={criteria.allowedConditions}
        onChange={(value) => updateParameter('allowedConditions', value)}
      />

      {/* Disallowed weather conditions */}
      <WeatherConditionSelector
        title="Disallowed Weather Conditions"
        conditions={AVAILABLE_WEATHER_CONDITIONS}
        selected={criteria.disallowedConditions}
        onChange={(value) => updateParameter('disallowedConditions', value)}
      />

      {/* Action buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.resetButton]}
          onPress={handleReset}
          disabled={saving}
        >
          <Text style={styles.buttonText}>Reset to Defaults</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.saveButton,
            (!isDirty || saving) && styles.disabledButton
          ]}
          onPress={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  subheaderText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  noUserContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 10,
  },
  noUserText: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
  },
  parameterContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  errorContainer: {
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
  parameterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  valueText: {
    fontWeight: 'bold',
    color: '#34495e',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  conditionSelectorContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  conditionItem: {
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    padding: 8,
    margin: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedCondition: {
    backgroundColor: '#3498db',
  },
  conditionText: {
    color: '#34495e',
  },
  selectedConditionText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  saveButton: {
    backgroundColor: '#2ecc71',
  },
  resetButton: {
    backgroundColor: '#95a5a6',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  feedbackContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successFeedback: {
    backgroundColor: '#d5f5e3',
  },
  errorFeedback: {
    backgroundColor: '#f8d7da',
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorMessageContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffecee',
    borderRadius: 4,
  },
  errorMessage: {
    color: '#e74c3c',
    fontSize: 12,
  },
});

export default WeatherCriteriaForm;