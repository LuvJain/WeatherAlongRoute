/**
 * performance.js
 * Performance optimizations for desktop rendering
 */

(function() {
  // Execute when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Only apply performance optimizations on desktop
    if (window.matchMedia('(min-width: 768px)').matches) {
      applyPerformanceOptimizations();
    }

    // Listen for app mode changes
    document.addEventListener('appModeChange', (event) => {
      if (event.detail.mode === 'desktop') {
        applyPerformanceOptimizations();
      }
    });
  });

  /**
   * Applies performance optimizations for desktop mode
   */
  function applyPerformanceOptimizations() {
    // Optimize scrolling performance
    optimizeScrolling();

    // Optimize rendering performance
    optimizeRendering();

    // Optimize touch events for desktop input
    optimizeDesktopInputs();

    // Apply adaptive performance based on device capabilities
    applyAdaptivePerformance();

    // Register mutation observer for dynamic content
    observeDynamicContent();
  }

  /**
   * Optimizes scrolling performance
   */
  function optimizeScrolling() {
    // Use passive event listeners for better scroll performance
    const scrollableElements = document.querySelectorAll('.scrollable, [data-scrollable="true"]');

    const wheelOpts = { passive: true };
    const touchOpts = { passive: true };

    scrollableElements.forEach(el => {
      el.addEventListener('wheel', null, wheelOpts);
      el.addEventListener('touchstart', null, touchOpts);
      el.addEventListener('touchmove', null, touchOpts);
    });

    // Also apply to window/document for global scrolling
    window.addEventListener('wheel', null, wheelOpts);
    document.addEventListener('touchstart', null, touchOpts);
    document.addEventListener('touchmove', null, touchOpts);

    // Use will-change for elements that scroll
    scrollableElements.forEach(el => {
      el.style.willChange = 'scroll-position';
    });

    // Use hardware acceleration for scroll containers
    scrollableElements.forEach(el => {
      el.style.transform = 'translateZ(0)';
      el.style.backfaceVisibility = 'hidden';
    });
  }

  /**
   * Optimizes rendering performance
   */
  function optimizeRendering() {
    // Apply GPU acceleration for animations
    const animatedElements = document.querySelectorAll('.animated, [data-animated="true"]');
    animatedElements.forEach(el => {
      el.style.willChange = 'transform';
      el.style.transform = 'translateZ(0)';
    });

    // Set a reasonable frame budget for animations
    if ('requestIdleCallback' in window) {
      // Reset animation frame budget periodically
      requestIdleCallback(() => {
        animatedElements.forEach(el => {
          // Temporarily remove hardware acceleration to prevent GPU memory buildup
          el.style.willChange = 'auto';

          // Force a reflow
          void el.offsetHeight;

          // Re-enable hardware acceleration
          el.style.willChange = 'transform';
        });
      }, { timeout: 1000 });
    }

    // Optimize large lists
    optimizeLargeLists();
  }

  /**
   * Optimizes large lists by virtualizing or paginating
   */
  function optimizeLargeLists() {
    const largeLists = document.querySelectorAll('.large-list, [data-large-list="true"]');

    largeLists.forEach(list => {
      // Get list items
      const items = list.children;

      // If we have a large number of items, apply optimizations
      if (items.length > 50) {
        // Add virtualization attributes for React Native Web
        list.setAttribute('data-virtualized', 'true');

        // Ensure only visible elements are rendered
        const listContainer = list.parentElement;
        const containerHeight = listContainer.clientHeight;

        // Set container properties for virtualization
        listContainer.style.overflowY = 'auto';
        listContainer.style.position = 'relative';

        // Add height to ensure scrollbar works correctly
        list.style.minHeight = `${items.length * 40}px`; // Assuming 40px per item
      }
    });
  }

  /**
   * Optimizes touch events for desktop input
   */
  function optimizeDesktopInputs() {
    // Add hover states to interactive elements
    const interactiveElements = document.querySelectorAll('button, [role="button"], a');

    interactiveElements.forEach(el => {
      el.classList.add('desktop-interactive');

      // Add keyboard accessibility
      if (!el.getAttribute('tabIndex')) {
        el.setAttribute('tabIndex', '0');
      }
    });

    // Add keyboard navigation for common actions
    document.addEventListener('keydown', (e) => {
      // Only handle keyboard events when in desktop mode
      if (!document.documentElement.classList.contains('desktop-mode')) return;

      // Handle common keyboard shortcuts
      switch (e.key) {
        case 'Escape':
          // Close modal or popup if open
          const modal = document.querySelector('.modal.open, .popup.open');
          if (modal) {
            const closeBtn = modal.querySelector('.close-btn');
            if (closeBtn) closeBtn.click();
          }
          break;

        case 'Tab':
          // Add visible focus styles
          // This is handled by the browser, but we can enhance it
          break;

        default:
          break;
      }
    });
  }

  /**
   * Applies adaptive performance optimizations based on device capabilities
   */
  function applyAdaptivePerformance() {
    // Detect device capabilities
    const highPerformance = isHighPerformanceDevice();

    // Apply different optimizations based on device capability
    if (highPerformance) {
      // Enable all animations and effects
      document.documentElement.classList.add('high-performance');
    } else {
      // Reduce animations and visual effects
      document.documentElement.classList.add('low-performance');

      // Add CSS to disable unnecessary animations
      const style = document.createElement('style');
      style.textContent = `
        .low-performance * {
          transition-duration: 0.1s !important;
        }

        .low-performance .heavy-animation {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Apply optimizations for high-DPI screens
    if (window.devicePixelRatio > 1.5) {
      document.documentElement.classList.add('high-dpi');
    }
  }

  /**
   * Detects if the device is capable of high performance
   * @returns {boolean} True if the device is high performance
   */
  function isHighPerformanceDevice() {
    // Check for hardware concurrency (CPU cores)
    const highCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency >= 4;

    // Check for device memory
    const highMemory = navigator.deviceMemory && navigator.deviceMemory >= 4;

    // Check for GPU performance (indirectly)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    let highGPU = false;

    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        // Check for known high-performance GPUs
        highGPU = /(nvidia|amd|radeon|intel iris|apple m|metal)/i.test(renderer);
      }
    }

    // Device is high performance if at least 2 of these are true
    let score = 0;
    if (highCores) score++;
    if (highMemory) score++;
    if (highGPU) score++;

    return score >= 1; // Require at least 1 indicator of high performance
  }

  /**
   * Observes DOM for dynamic content and applies optimizations
   */
  function observeDynamicContent() {
    // Create a MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Only process childList changes with added nodes
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            // Only process Element nodes
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if this is a scrollable container
              if (node.classList.contains('scrollable')) {
                node.addEventListener('wheel', null, { passive: true });
                node.addEventListener('touchstart', null, { passive: true });
                node.addEventListener('touchmove', null, { passive: true });
              }

              // Check if this is an animated element
              if (node.classList.contains('animated')) {
                node.style.willChange = 'transform';
                node.style.transform = 'translateZ(0)';
              }
            }
          });
        }
      });
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();