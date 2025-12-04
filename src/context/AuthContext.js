/**
 * Authentication Context
 * Provides authentication state and functions to components
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';

// Sample driver data (in a real app, this would come from a backend)
const SAMPLE_DRIVERS = [
  {
    id: 'driver1',
    username: 'driver1',
    password: 'password1',
    name: 'John Smith',
    email: 'john@example.com',
    role: 'driver',
    preferences: {}
  },
  {
    id: 'driver2',
    username: 'driver2',
    password: 'password2',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'driver',
    preferences: {}
  },
  {
    id: 'admin',
    username: 'admin',
    password: 'admin123',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    preferences: {}
  }
];

// Create authentication context
export const AuthContext = createContext();

// Authentication provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for stored session on mount
  useEffect(() => {
    const checkStoredSession = async () => {
      try {
        // In a real app, we would check AsyncStorage (React Native) or localStorage (Web)
        // for a stored auth token and validate it with the backend

        // For this demo, we'll just simulate a delay
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } catch (error) {
        setError('Failed to restore authentication state');
        setLoading(false);
      }
    };

    checkStoredSession();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Find user with matching credentials
      const user = SAMPLE_DRIVERS.find(
        user => user.username === username && user.password === password
      );

      if (user) {
        // Remove sensitive data before storing in state
        const { password, ...userWithoutPassword } = user;

        // In a real app, we would save the auth token to AsyncStorage/localStorage
        setCurrentUser(userWithoutPassword);
        return true;
      } else {
        setError('Invalid username or password');
        return false;
      }
    } catch (error) {
      setError('Authentication failed: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);

      // In a real app, we would clear the auth token from AsyncStorage/localStorage
      // and inform the backend about the logout

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setCurrentUser(null);
    } catch (error) {
      setError('Logout failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Update user preferences
  const updateUserPreferences = async (preferences) => {
    try {
      setLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      // Update user with new preferences
      setCurrentUser(prevUser => ({
        ...prevUser,
        preferences: {
          ...prevUser.preferences,
          ...preferences
        }
      }));

      return true;
    } catch (error) {
      setError('Failed to update preferences: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get all users (admin function)
  const getAllUsers = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Unauthorized access');
      return null;
    }

    try {
      setLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Return users without passwords
      return SAMPLE_DRIVERS.map(({ password, ...user }) => user);
    } catch (error) {
      setError('Failed to fetch users: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    updateUserPreferences,
    getAllUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};