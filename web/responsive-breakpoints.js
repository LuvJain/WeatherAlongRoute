/**
 * responsive-breakpoints.js
 * Handles responsive layout adaptation for different screen sizes
 */

(function() {
  // Define our breakpoints (matching CSS media queries)
  const BREAKPOINTS = {
    xs: 320,  // Extra small devices
    sm: 576,  // Small devices
    md: 768,  // Medium devices (tablets)
    lg: 992,  // Large devices (desktops)
    xl: 1200, // Extra large devices
  };

  // Current active breakpoint
  let currentBreakpoint = '';

  // Initialize when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    setupResponsiveHelpers();
  });

  /**
   * Sets up responsive helpers in the window object
   * for use in other scripts and by Electron
   */
  function setupResponsiveHelpers() {
    // Expose methods to window for Electron communication
    window.updateResponsiveLayout = updateResponsiveLayout;
    window.setAppMode = setAppMode;

    // Set initial breakpoint
    updateBreakpoint();

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    // Setup initial mode based on size
    const isDesktopSize = window.matchMedia('(min-width: 768px)').matches;
    setAppMode(isDesktopSize ? 'desktop' : 'mobile', window.innerWidth, window.innerHeight);

    // Create a debug helper for development
    if (process.env.NODE_ENV === 'development') {
      createBreakpointIndicator();
    }
  }

  /**
   * Updates the layout when window dimensions change
   * @param {number} width - Window width
   * @param {number} height - Window height
   */
  function updateResponsiveLayout(width, height) {
    width = width || window.innerWidth;
    height = height || window.innerHeight;

    // Determine breakpoint from width
    updateBreakpoint(width);

    // Update the root element with current breakpoint
    document.documentElement.setAttribute('data-breakpoint', currentBreakpoint);

    // Update debug display if it exists
    updateBreakpointIndicator();

    // Apply device-specific optimizations
    applyDeviceOptimizations();
  }

  /**
   * Sets the application mode (mobile or desktop)
   * @param {string} mode - 'mobile' or 'desktop'
   * @param {number} width - Window width
   * @param {number} height - Window height
   */
  function setAppMode(mode, width, height) {
    // Add appropriate class to document
    document.documentElement.classList.toggle('desktop-mode', mode === 'desktop');
    document.documentElement.classList.toggle('mobile-mode', mode === 'mobile');

    // Fire a custom event that React components can listen for
    const event = new CustomEvent('appModeChange', {
      detail: { mode, width, height }
    });
    document.dispatchEvent(event);

    // Apply specific adaptations based on mode
    if (mode === 'desktop') {
      // Handle desktop-specific adaptations
      enableDesktopAdaptations();
    } else {
      // Handle mobile-specific adaptations
      enableMobileAdaptations();
    }
  }

  /**
   * Window resize handler with debounce
   */
  let resizeTimeout;
  function handleResize() {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }

    // Debounce resize events for performance
    resizeTimeout = setTimeout(() => {
      updateResponsiveLayout();
    }, 100);
  }

  /**
   * Updates the current breakpoint based on window width
   * @param {number} width - Window width
   */
  function updateBreakpoint(width) {
    width = width || window.innerWidth;

    if (width < BREAKPOINTS.sm) {
      currentBreakpoint = 'xs';
    } else if (width < BREAKPOINTS.md) {
      currentBreakpoint = 'sm';
    } else if (width < BREAKPOINTS.lg) {
      currentBreakpoint = 'md';
    } else if (width < BREAKPOINTS.xl) {
      currentBreakpoint = 'lg';
    } else {
      currentBreakpoint = 'xl';
    }
  }

  /**
   * Applies desktop-specific adaptations
   */
  function enableDesktopAdaptations() {
    // Add keyboard accessibility attributes
    document.querySelectorAll('button, [role="button"], a')
      .forEach(el => {
        if (!el.getAttribute('tabIndex')) {
          el.setAttribute('tabIndex', '0');
        }
      });

    // Show scrollbars for better desktop experience
    const style = document.createElement('style');
    style.id = 'desktop-scrollbar-style';
    style.textContent = `
      ::-webkit-scrollbar {
        display: block;
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
    `;

    // Only add if not already present
    if (!document.getElementById('desktop-scrollbar-style')) {
      document.head.appendChild(style);
    }

    // Make container responsive to desktop size
    const rootEl = document.getElementById('root');
    if (rootEl && !rootEl.classList.contains('desktop-container')) {
      rootEl.classList.add('desktop-container');
    }
  }

  /**
   * Applies mobile-specific adaptations
   */
  function enableMobileAdaptations() {
    // Remove desktop scrollbar styles
    const scrollbarStyle = document.getElementById('desktop-scrollbar-style');
    if (scrollbarStyle) {
      scrollbarStyle.remove();
    }

    // Remove desktop container class
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.classList.remove('desktop-container');
    }
  }

  /**
   * Apply device-specific optimizations based on capabilities
   */
  function applyDeviceOptimizations() {
    // Detect if device supports touch
    const supportsTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    document.documentElement.classList.toggle('touch-device', supportsTouch);
    document.documentElement.classList.toggle('mouse-device', !supportsTouch);

    // Add device pixel ratio class for high DPI optimizations
    const dpr = window.devicePixelRatio || 1;
    document.documentElement.classList.toggle('high-dpi', dpr > 1.5);

    // Detect low-end devices and apply optimizations
    const isLowEndDevice = navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency <= 4
      : false;

    if (isLowEndDevice) {
      document.documentElement.classList.add('low-end-device');
      // Disable animations for better performance on low-end devices
      const style = document.createElement('style');
      style.textContent = `
        .low-end-device * {
          transition: none !important;
          animation: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Creates a visual breakpoint indicator for development
   */
  function createBreakpointIndicator() {
    const indicatorId = 'breakpoint-indicator';

    // Only create if it doesn't exist
    if (!document.getElementById(indicatorId)) {
      const indicator = document.createElement('div');
      indicator.id = indicatorId;
      indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
      `;

      document.body.appendChild(indicator);
    }

    updateBreakpointIndicator();
  }

  /**
   * Updates the breakpoint indicator display
   */
  function updateBreakpointIndicator() {
    const indicator = document.getElementById('breakpoint-indicator');
    if (indicator) {
      indicator.textContent = `${currentBreakpoint} (${window.innerWidth}x${window.innerHeight})`;
    }
  }
})();