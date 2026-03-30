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
    CapacitorHttp: {
      enabled: true,
    },
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
    LocalNotifications: {
      // Android: use the frog (Kix) icon for notification small icon
      smallIcon: 'ic_notification',
      // Teal accent colour for notification LED / icon tint
      iconColor: '#0f766e',
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
  },
};

export default config;
