const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// Device presets for mobile device simulation
const devicePresets = {
  iPhone12: {
    width: 390,
    height: 844,
    label: 'iPhone 12',
    scaleFactor: 1
  },
  iPhone8: {
    width: 375,
    height: 667,
    label: 'iPhone 8',
    scaleFactor: 1
  },
  Pixel5: {
    width: 393,
    height: 851,
    label: 'Pixel 5',
    scaleFactor: 1
  },
  SamsungGalaxyS20: {
    width: 360,
    height: 800,
    label: 'Samsung Galaxy S20',
    scaleFactor: 1
  }
};

// Desktop responsive modes
const desktopPresets = {
  responsive: {
    width: 1200,
    height: 800,
    label: 'Responsive Desktop Mode',
    scaleFactor: 1
  },
  smallDesktop: {
    width: 992,
    height: 700,
    label: 'Small Desktop',
    scaleFactor: 1
  },
  tablet: {
    width: 768,
    height: 1024,
    label: 'Tablet',
    scaleFactor: 1
  }
};

// Default device to use
let currentDevice = devicePresets.iPhone12;
let isResponsiveMode = false;

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Create user preferences for window size
const userPreferences = {
  saveWindowSize: true,
  windowBounds: { width: currentDevice.width, height: currentDevice.height }
};

function createWindow() {
  // Create the browser window with mobile dimensions by default
  // or use saved dimensions if available
  mainWindow = new BrowserWindow({
    width: currentDevice.width,
    height: currentDevice.height,
    minWidth: 320,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Enable hardware acceleration for better performance
      webSecurity: true,
      experimentalFeatures: true
    },
    title: `Weather Along Route - ${currentDevice.label} Preview`,
    resizable: true,
    center: true,
    show: false // Don't show until ready
  });

  // Load the app from webpack dev server in development
  // or from the dist folder in production
  const startUrl = process.env.NODE_ENV === 'development'
    ? process.env.ELECTRON_HOT
      ? 'http://localhost:8080' // Webpack dev server with hot reload
      : 'http://localhost:8081' // React Native packager
    : url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true
      });

  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Apply CSS zoom level if needed
    if (currentDevice.scaleFactor !== 1) {
      mainWindow.webContents.setZoomFactor(currentDevice.scaleFactor);
    }
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Create device selection menu
  createMenu();

  // Save window size on close if enabled
  mainWindow.on('close', () => {
    if (userPreferences.saveWindowSize) {
      userPreferences.windowBounds = mainWindow.getBounds();
    }
  });

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Listen for window resize events to update UI
  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize();
    mainWindow.webContents.executeJavaScript(`
      if (window.updateResponsiveLayout) {
        window.updateResponsiveLayout(${width}, ${height});
      }
    `);
  });
}

// Create the application menu with device selection options
function createMenu() {
  const deviceMenuItems = Object.keys(devicePresets).map(key => {
    return {
      label: devicePresets[key].label,
      click: () => {
        changeDeviceMode(devicePresets[key], false);
      },
      type: 'radio',
      checked: !isResponsiveMode && devicePresets[key].label === currentDevice.label
    };
  });

  const desktopMenuItems = Object.keys(desktopPresets).map(key => {
    return {
      label: desktopPresets[key].label,
      click: () => {
        changeDeviceMode(desktopPresets[key], true);
      },
      type: 'radio',
      checked: isResponsiveMode && desktopPresets[key].label === currentDevice.label
    };
  });

  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        {
          label: 'Mobile Device Presets',
          submenu: deviceMenuItems
        },
        {
          label: 'Desktop Modes',
          submenu: desktopMenuItems
        },
        { type: 'separator' },
        {
          label: 'Toggle Full Responsive Mode',
          click: () => {
            toggleFullResponsiveMode();
          },
          type: 'checkbox',
          checked: isResponsiveMode
        }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Remember Window Size',
          type: 'checkbox',
          checked: userPreferences.saveWindowSize,
          click: () => {
            userPreferences.saveWindowSize = !userPreferences.saveWindowSize;
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://electronjs.org');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Function to toggle between responsive mode and device preset mode
function toggleFullResponsiveMode() {
  if (isResponsiveMode) {
    // Switch back to the previous device preset
    isResponsiveMode = false;
    changeDeviceMode(devicePresets.iPhone12, false);
  } else {
    // Switch to responsive mode
    isResponsiveMode = true;
    changeDeviceMode(desktopPresets.responsive, true);
  }
}

// Function to change window dimensions based on device preset
function changeDeviceMode(device, responsive) {
  if (!mainWindow) return;

  currentDevice = device;
  isResponsiveMode = responsive;

  // Set window size
  mainWindow.setSize(device.width, device.height);
  mainWindow.center();

  // Update title
  mainWindow.setTitle(`Weather Along Route - ${device.label} Preview`);

  // Apply zoom factor if specified
  if (device.scaleFactor !== undefined) {
    mainWindow.webContents.setZoomFactor(device.scaleFactor);
  }

  // Set CSS media mode via JavaScript
  mainWindow.webContents.executeJavaScript(`
    document.documentElement.classList.toggle('desktop-mode', ${responsive});
    document.documentElement.classList.toggle('mobile-mode', ${!responsive});

    // Let the app know about the mode change
    if (window.setAppMode) {
      window.setAppMode('${responsive ? 'desktop' : 'mobile'}', ${device.width}, ${device.height});
    }
  `);

  // Update menu to show the correct selection
  createMenu();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it's common for applications to stay active until the user quits
  // explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  // On macOS it's common to re-create a window when the dock icon is clicked
  // and there are no other windows open.
  if (mainWindow === null) createWindow();
});