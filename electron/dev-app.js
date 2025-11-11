const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
// Keep track of child processes
let webpackProcess;
let reactNativeProcess;

// Mobile device dimensions for the iPhone 12
const defaultWidth = 390;
const defaultHeight = 844;

function createWindow() {
  // Create the browser window with mobile dimensions
  mainWindow = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    minWidth: 320,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Weather Along Route - Mobile Preview (Dev)',
    resizable: true
  });

  // Load the app from webpack dev server
  const startUrl = 'http://localhost:8081';
  mainWindow.loadURL(startUrl);

  // Open DevTools
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Start webpack dev server and React Native packager
function startDevServers() {
  console.log('Starting webpack dev server...');
  webpackProcess = spawn('npx', ['webpack', 'serve', '--config', 'webpack.config.js'], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  console.log('Starting React Native packager...');
  reactNativeProcess = spawn('npm', ['start'], {
    shell: true,
    stdio: 'inherit'
  });
}

// Clean up child processes on exit
function cleanUp() {
  if (webpackProcess) {
    console.log('Killing webpack process...');
    webpackProcess.kill();
  }

  if (reactNativeProcess) {
    console.log('Killing React Native process...');
    reactNativeProcess.kill();
  }

  app.quit();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  startDevServers();
  createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  cleanUp();
});

app.on('activate', function () {
  // On macOS it's common to re-create a window when the dock icon is clicked
  // and there are no other windows open.
  if (mainWindow === null) createWindow();
});