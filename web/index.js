import React from 'react';
import { AppRegistry, Platform } from 'react-native';
import App from '../App';

// Import CSS for responsive design
import './responsive.css';

// Register the app with the same name as in the mobile entry points
AppRegistry.registerComponent('WeatherAlongRoute', () => App);

// Initialize the app with the DOM render function
AppRegistry.runApplication('WeatherAlongRoute', {
  rootTag: document.getElementById('root')
});

// Detect if we're running in Electron/desktop environment
const isElectron = window && window.process && window.process.type;
const isDesktop = isElectron || (Platform.OS === 'web' && window.matchMedia('(min-width: 768px)').matches);

if (isDesktop) {
  // Touch-to-mouse event translation for desktop
  document.addEventListener('DOMContentLoaded', function() {
    /**
     * Add touch event polyfills for desktop interaction
     * This helps with components that expect touch events
     */
    const touchEventHandlers = {
      onMouseDown: (e) => {
        // Create and dispatch touch start event
        const touchEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [createTouch(e)],
          targetTouches: [createTouch(e)],
          changedTouches: [createTouch(e)]
        });
        e.target.dispatchEvent(touchEvent);
      },
      onMouseMove: (e) => {
        // Create and dispatch touch move event
        const touchEvent = new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [createTouch(e)],
          targetTouches: [createTouch(e)],
          changedTouches: [createTouch(e)]
        });
        e.target.dispatchEvent(touchEvent);
      },
      onMouseUp: (e) => {
        // Create and dispatch touch end event
        const touchEvent = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [createTouch(e)]
        });
        e.target.dispatchEvent(touchEvent);
      }
    };

    // Helper function to create Touch object from mouse event
    function createTouch(e) {
      return new Touch({
        identifier: Date.now(),
        target: e.target,
        clientX: e.clientX,
        clientY: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        radiusX: 2.5,
        radiusY: 2.5,
        rotationAngle: 0,
        force: 1
      });
    }

    // Polyfill TouchEvent if it's not available (mainly for desktop browsers)
    if (typeof TouchEvent !== 'function') {
      window.TouchEvent = function(type, config) {
        const event = new Event(type, config);
        event.touches = config.touches || [];
        event.targetTouches = config.targetTouches || [];
        event.changedTouches = config.changedTouches || [];
        return event;
      };

      window.Touch = function(config) {
        Object.assign(this, config);
      };
    }

    // Apply desktop-specific performance optimizations
    const style = document.createElement('style');
    style.textContent = `
      /* Desktop performance optimizations */
      * {
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      /* Hardware acceleration for smoother animations */
      .app-container {
        transform: translateZ(0);
        will-change: transform;
      }
    `;
    document.head.appendChild(style);

    // Add keyboard accessibility for interactive elements
    document.querySelectorAll('button, [role="button"], a')
      .forEach(el => {
        if (!el.getAttribute('tabIndex')) {
          el.setAttribute('tabIndex', '0');
        }
        // Add keyboard event handler to simulate click on Enter/Space
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
          }
        });
      });
  });
}