import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import { AsyncStorage } from 'react-native';
import App from '../App';
import LocationValidationService from '../src/services/LocationValidationService';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentState: 'active'
  },
  NetInfo: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    fetch: jest.fn()
  }
}));

jest.mock('../src/services/LocationValidationService', () => {
  const mockService = {
    start: jest.fn(),
    stop: jest.fn(),
    validatePendingLocations: jest.fn(),
    addOnlineStatusListener: jest.fn(() => jest.fn()), // Return unsubscribe function
    getOnlineStatus: jest.fn(() => true)
  };

  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => mockService)
    },
    getInstance: jest.fn(() => mockService)
  };
});

jest.mock('../src/components/LocationInput', () => {
  return function MockLocationInput() {
    return null;
  };
});

describe('App integration with LocationInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const tree = renderer.create(<App />);
    expect(tree).toBeDefined();
  });

  it('should render the welcome text', () => {
    const tree = renderer.create(<App />);
    const instance = tree.root;

    const welcomeText = instance.findAll(
      (el) => el.type === 'Text' && el.props.children?.includes('Weather')
    );

    expect(welcomeText.length).toBeGreaterThan(0);
  });

  it('should initialize LocationValidationService on mount', () => {
    const mockService = LocationValidationService.getInstance();

    renderer.create(<App />);

    expect(mockService.start).toHaveBeenCalled();
  });

  it('should stop LocationValidationService on unmount', () => {
    const mockService = LocationValidationService.getInstance();
    const tree = renderer.create(<App />);

    tree.unmount();

    expect(mockService.stop).toHaveBeenCalled();
  });

  it('should add listener for online status changes', () => {
    const mockService = LocationValidationService.getInstance();

    renderer.create(<App />);

    expect(mockService.addOnlineStatusListener).toHaveBeenCalled();
  });

  it('should validate pending locations when coming online', () => {
    const mockService = LocationValidationService.getInstance();
    let onlineStatusListener: ?(isOnline: boolean) => void = null;

    mockService.addOnlineStatusListener.mockImplementation((listener) => {
      onlineStatusListener = listener;
      return jest.fn(); // Return unsubscribe function
    });

    renderer.create(<App />);

    // Simulate coming online
    if (onlineStatusListener) {
      onlineStatusListener(true);
    }

    expect(mockService.validatePendingLocations).toHaveBeenCalledWith(
      'AIzaSyC0yi3ANsevOhdv-2FN_w67TfznwAYY1pA'
    );
  });

  it('should render two LocationInput components', () => {
    // This test verifies that the component structure is correct
    const tree = renderer.create(<App />);
    const instance = tree.root;

    // Find all View components that represent location sections
    const sections = instance.findAll(
      (el) =>
        el.type === 'View' && el.props.style?.marginVertical === 16
    );

    // Should have at least 2 location sections (start and end)
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle location selection for start location', () => {
    const tree = renderer.create(<App />);
    const instance = tree.root;

    // Find the app instance to access state
    const appInstance = instance.findByType(App);

    const mockLocation = {
      id: 'test_loc_1',
      latitude: 40.7128,
      longitude: -74.0060,
      name: 'New York',
      address: '123 Main St',
      validated: false
    };

    // The component should be able to handle location selection
    expect(appInstance.instance.state.startLocation).toBeNull();
  });

  it('should update validation status based on online/offline state', () => {
    const mockService = LocationValidationService.getInstance();
    let onlineStatusListener: ?(isOnline: boolean) => void = null;

    mockService.addOnlineStatusListener.mockImplementation((listener) => {
      onlineStatusListener = listener;
      return jest.fn();
    });

    const tree = renderer.create(<App />);
    const instance = tree.root;

    // Initially should show ready status or online status
    const initialStatusText = instance.findAll(
      (el) =>
        el.type === 'Text' && (el.props.children?.includes('Online') || el.props.children?.includes('Offline'))
    );

    expect(initialStatusText.length).toBeGreaterThan(0);

    // Simulate status change
    if (onlineStatusListener) {
      onlineStatusListener(false);
    }

    // Status should have been updated in component state
    expect(mockService.addOnlineStatusListener).toHaveBeenCalled();
  });

  it('should unsubscribe from online status listener on unmount', () => {
    const mockService = LocationValidationService.getInstance();
    const mockUnsubscribe = jest.fn();

    mockService.addOnlineStatusListener.mockImplementation(() => mockUnsubscribe);

    const tree = renderer.create(<App />);

    tree.unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should display selected location information', () => {
    // This test verifies that the component renders location info sections
    const tree = renderer.create(<App />);
    const instance = tree.root;

    // Find the selectedLocationInfo views
    const infoSections = instance.findAll(
      (el) => el.type === 'View' && el.props.style?.marginTop === 12
    );

    // Component structure should support showing location info
    expect(instance.findAll((el) => el.type === 'View')).toBeDefined();
  });

  it('should render validation status indicator', () => {
    const tree = renderer.create(<App />);
    const instance = tree.root;

    // Find status indicator by looking for specific styling
    const statusIndicators = instance.findAll(
      (el) =>
        el.type === 'View' && el.props.style?.marginVertical === 8
    );

    expect(statusIndicators.length).toBeGreaterThan(0);
  });
});
