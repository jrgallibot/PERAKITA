import type { ConfigContext, ExpoConfig } from 'expo/config';
import path from 'path';

try {
  require(path.resolve(__dirname, '../../scripts/load-root-env.cjs'));
} catch {
  // EAS/local builds inject EXPO_PUBLIC_* via env; optional root loader.
}

const publicEnv = {
  EXPO_PUBLIC_WEB_APP_URL: process.env.EXPO_PUBLIC_WEB_APP_URL ?? '',
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PeraKita',
  slug: 'perakita',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'perakita',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0D9488',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.perakita.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0D9488',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    softwareKeyboardLayoutMode: 'resize',
    package: 'com.perakita.app',
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    './plugins/withMonorepoAndroidRoot',
    'expo-router',
    'expo-secure-store',
    'expo-sqlite',
    'expo-asset',
    'expo-font',
    '@react-native-community/datetimepicker',
    'expo-notifications',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow PeraKita to access your photos for your profile picture.',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow PeraKita to use Face ID for quick sign-in and app unlock.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'f46f5ae0-5705-464e-b880-8ef785bd6b2d',
    },
    ...publicEnv,
  },
});
