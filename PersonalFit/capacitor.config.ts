import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.personalfit.app',
  appName: 'PersonalFit',
  webDir: 'dist',
  server: {
    // REQUIRED for IndexedDB and secure-context APIs on Android.
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      // 'Light' = white icons on dark background (teal). Counter-intuitive name — DO NOT change to 'Dark'.
      style: 'Light',
      backgroundColor: '#0f766e',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0c1f1e',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    Keyboard: {
      // 'native' is safer than 'body' for viewport-fit:cover layouts.
      resize: 'native',
      style: 'dark',
    },
  },
};

export default config;
