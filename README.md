# WeatherAlongRoute

A React Native application that helps users check the weather along their route. Users can enter their starting location and final destination to view weather conditions along their journey.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v10.x or later)
- [npm](https://www.npmjs.com/) (v6.x or later) or [Yarn](https://yarnpkg.com/) (v1.x or later)
- [React Native CLI](https://reactnative.dev/docs/environment-setup) (`npm install -g react-native-cli`)
- For iOS development:
  - macOS
  - Xcode (latest version)
  - CocoaPods (`sudo gem install cocoapods`)
- For Android development:
  - Android Studio
  - Java Development Kit (JDK) 8 or newer
  - Android SDK
  - Android device or emulator

## Environment Setup

1. You need a Google Places API key for the location autocomplete functionality:
   - Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Google Places API
   - Create an API key with appropriate restrictions
   - Replace the API key in `App.js` (line 35)

## Installation

Follow these steps to set up the project locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/WeatherAlongRoute.git
   cd WeatherAlongRoute
   ```

2. Install dependencies:
   ```bash
   npm install
   # or if you use yarn
   yarn install
   ```

3. For iOS (macOS only), install CocoaPods dependencies:
   ```bash
   cd ios
   pod install
   cd ..
   ```

## Running the Application

### Start the Development Server

To start the Metro bundler development server, run:

```bash
npm start
# or
yarn start
```

### Run on iOS Simulator (macOS only)

```bash
npm run ios
# or
yarn ios
```

### Run on Android Emulator or Device

```bash
npm run android
# or
yarn android
```

## Deployment

### Deploying to Expo

For quick testing and sharing:

1. Install Expo CLI:
   ```bash
   npm install -g expo-cli
   ```

2. Initialize Expo in your project (if not already done):
   ```bash
   expo init --template bare-minimum
   ```

3. Build and publish:
   ```bash
   expo publish
   ```

### Building for Production

#### iOS (macOS only)

1. Configure app settings in Xcode:
   - Open the `ios/WeatherAlongRoute.xcworkspace` file in Xcode
   - Update bundle identifier, version, etc.
   - Set up signing certificates

2. Build the app:
   - Select "Generic iOS Device" as the build target
   - Choose Product > Archive
   - Follow the prompts to distribute your app

#### Android

1. Update the version in `android/app/build.gradle`

2. Generate a signed APK/AAB:
   ```bash
   cd android
   ./gradlew assembleRelease
   # or for app bundle
   ./gradlew bundleRelease
   ```

3. The output files will be in `android/app/build/outputs/`

### Deploying to Netlify/Vercel

For web version (requires [React Native Web](https://necolas.github.io/react-native-web/)):

1. Add web support:
   ```bash
   npm install react-native-web react-dom
   # or
   yarn add react-native-web react-dom
   ```

2. Create a web entry point (e.g., `index.web.js`)

3. Configure a build script in `package.json`:
   ```json
   "scripts": {
     "build-web": "react-scripts build",
     "start-web": "react-scripts start"
   }
   ```

#### Deploying to Netlify

1. Create a `netlify.toml` file in the root directory:
   ```toml
   [build]
     command = "npm run build-web"
     publish = "build"
   ```

2. Connect your repository to Netlify through their dashboard
3. Configure build settings using the same build command
4. Deploy your site

#### Deploying to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   # or
   yarn global add vercel
   ```

2. Configure a `vercel.json` file:
   ```json
   {
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": { "distDir": "build" }
       }
     ]
   }
   ```

3. Deploy:
   ```bash
   vercel
   ```

## Troubleshooting

### Common Issues

#### Metro Bundler Port Conflicts

If you see an error about port 8081 being in use:

```bash
# Find and kill the process using port 8081
lsof -i :8081
kill -9 <PID>
```

#### iOS Build Failures

1. Clean the build:
   ```bash
   cd ios
   xcodebuild clean
   pod install
   cd ..
   ```

2. Reset cache and reinstall node modules:
   ```bash
   npm start -- --reset-cache
   # or
   yarn start -- --reset-cache
   ```

#### Android Gradle Issues

1. Update Gradle in `android/gradle/wrapper/gradle-wrapper.properties`
2. Clean the project:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

#### "Unrecognized font family" Error

This usually happens when linking font assets:

```bash
react-native link
```

### API Key Issues

If you see errors related to the Google Places API:
1. Verify your API key is correct
2. Ensure you've enabled the correct APIs in Google Cloud Console
3. Check if you have billing enabled (required for some Google APIs)

## License

[MIT](LICENSE)