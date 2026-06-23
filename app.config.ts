import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Mira",
  slug: "mira",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "mira",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.mira.app",
    infoPlist: {
      NSCameraUsageDescription:
        "Mira uses the camera to take photos of your meals for nutrition analysis.",
      NSPhotoLibraryUsageDescription:
        "Mira accesses your photo library so you can log meals from existing photos.",
    },
  },
  android: {
    package: "com.mira.app",
    adaptiveIcon: {
      backgroundColor: "#E6F7F4",
    },
    permissions: ["CAMERA", "READ_EXTERNAL_STORAGE"],
  },
  web: {
    bundler: "metro",
    output: "single",
  },
  plugins: [
    "expo-router",
    "expo-camera",
    "expo-image-picker",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#E6F7F4",
        resizeMode: "contain",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
