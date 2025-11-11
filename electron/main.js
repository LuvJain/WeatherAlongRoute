const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// Device presets for mobile device simulation
const devicePresets = {
  iPhone12: {
    width: 390,
    height: 844,
    label: 'iPhone 12'
  },
  iPhone8: {
    width: 375,
    height: 667,
    label: 'iPhone 8'
  },
  Pixel5: {
    width: 393,
    height: 851,
    label: 'Pixel 5'
  },
  SamsungGalaxyS20: {
    width: 360,
    height: 800,
    label: 'Samsung Galaxy S20'
  }
};

// Default device to use
let currentDevice = devicePresets.iPhone12;

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Create the browser window with mobile dimensions
  mainWindow = new BrowserWindow({
    width: currentDevice.width,
    height: currentDevice.height,
    minWidth: 320,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: `Weather Along Route - ${currentDevice.label} Preview`,
    resizable: true
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

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Create device selection menu
  createMenu();

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Create the application menu with device selection options
function createMenu() {
  const deviceMenuItems = Object.keys(devicePresets).map(key => {
    return {
      label: devicePresets[key].label,
      click: () => {
        changeDeviceDimensions(devicePresets[key]);
      },
      type: 'radio',
      checked: devicePresets[key].label === currentDevice.label
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
          label: 'Device Presets',
          submenu: deviceMenuItems
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

// Function to change window dimensions based on device preset
function changeDeviceDimensions(device) {
  if (!mainWindow) return;

  currentDevice = device;
  mainWindow.setSize(device.width, device.height);
  mainWindow.setTitle(`Weather Along Route - ${device.label} Preview`);

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