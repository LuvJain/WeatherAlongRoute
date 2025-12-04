/**
 * Weather Settings Component
 * Combines form and visualization for a complete driver weather preferences interface
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getDriverCriteria } from '../../services/weatherCriteriaService';
import WeatherCriteriaForm from './WeatherCriteriaForm';
import WeatherCriteriaVisualization from './WeatherCriteriaVisualization';
import Login from '../auth/Login';

// Tab component for switching between form and visualization views
const TabSelector = ({ activeTab, onTabChange }) => (
  <View style={styles.tabContainer}>
    <TouchableOpacity
      style={[
        styles.tab,
        activeTab === 'form' && styles.activeTab
      ]}
      onPress={() => onTabChange('form')}
    >
      <Text
        style={[
          styles.tabText,
          activeTab === 'form' && styles.activeTabText
        ]}
      >
        Configure Criteria
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.tab,
        activeTab === 'visualization' && styles.activeTab
      ]}
      onPress={() => onTabChange('visualization')}
    >
      <Text
        style={[
          styles.tabText,
          activeTab === 'visualization' && styles.activeTabText
        ]}
      >
        Visual Summary
      </Text>
    </TouchableOpacity>
  </View>
);

// Main weather settings component
const WeatherSettings = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('form');
  const [criteria, setCriteria] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load criteria when user changes
  useEffect(() => {
    const loadCriteria = async () => {
      if (!currentUser) return;

      setLoading(true);
      setError(null);

      try {
        const driverCriteria = await getDriverCriteria(currentUser.id);
        setCriteria(driverCriteria);
      } catch (error) {
        console.error('Error loading criteria:', error);
        setError('Failed to load weather criteria. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadCriteria();
  }, [currentUser]);

  // If no user is logged in, show the login component
  if (!currentUser) {
    return <Login />;
  }

  // If loading, show spinner
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading your weather preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Weather Criteria Settings</Text>
          <Text style={styles.headerSubtitle}>
            Configure your personalized weather criteria for safe driving
          </Text>
        </View>
        <View style={styles.userContainer}>
          <Text style={styles.welcomeText}>
            Welcome, <Text style={styles.userName}>{currentUser.name}</Text>
          </Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error message display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Tab selector for switching views */}
      <TabSelector
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Content based on selected tab */}
      <View style={styles.contentContainer}>
        {activeTab === 'form' ? (
          <WeatherCriteriaForm />
        ) : (
          <WeatherCriteriaVisualization criteria={criteria} />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff',
  },
  headerContainer: {
    backgroundColor: '#3498db',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  welcomeText: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  userName: {
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#f8d7da',
    borderRadius: 4,
  },
  errorText: {
    color: '#e74c3c',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#95a5a6',
  },
  activeTabText: {
    color: '#3498db',
  },
  contentContainer: {
    flex: 1,
  },
});

export default WeatherSettings;