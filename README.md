# Weather Along Route

A React Native mobile application that provides weather information along your travel route.

## Features

- Search for starting and ending locations using Google Places Autocomplete
- View weather information along your route
- Support for both iOS and Android platforms
- Desktop preview with Electron

## Desktop Preview with Electron

This project includes an Electron-based desktop preview that allows you to view and test your mobile application in a simulated mobile device environment without needing an actual device or emulator.

### Setup

1. Install all dependencies:
   ```bash
   npm install
   ```

2. If you're running this for the first time, you may need to install additional dependencies for React Native:
   ```bash
   npm install -g react-native-cli
   ```

### Running the Desktop Preview

There are several ways to run the desktop preview:

#### Basic Mode
```bash
npm run electron
```
This will start both the React Native packager and the Electron app.

#### Development Mode with Hot Reloading
```bash
npm run electron:hot
```
This runs the app with webpack-dev-server for hot module reloading, giving you instant feedback as you make changes.

#### Development Mode with Full Dev Server Control
```bash
npm run electron:dev
```
This starts a separate development environment with automatic reloading of both React Native and Electron.

### Mobile Device Simulation

The Electron app simulates various mobile device dimensions:

- The default view mimics an iPhone 12 (390 x 844)
- You can change device dimensions from the View > Device Presets menu
- Available presets include iPhone 8, Pixel 5, and Samsung Galaxy S20

### Building for Distribution

To build the Electron app for distribution:
```bash
npm run electron:build
```
This will create distributable packages in the `dist` directory.

## Running on Actual Mobile Devices

To run the app on actual mobile devices or emulators:

### iOS
```bash
react-native run-ios
```

### Android
```bash
react-native run-android
```

## Development Notes

- The desktop preview uses `react-native-web` to render React Native components in a browser environment
- Hot reloading is enabled for both the mobile app and the desktop preview
- The desktop preview uses webpack for bundling and serving the web version
- The mobile app uses the standard React Native packager (Metro)

## Troubleshooting

- If you encounter issues with the desktop preview, try clearing your cache: `npm start -- --reset-cache`
- For issues with dependencies, try reinstalling: `rm -rf node_modules && npm install`
- Make sure you have the latest version of Electron: `npm install electron@latest --save-dev`
