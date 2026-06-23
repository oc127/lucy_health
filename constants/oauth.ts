import Constants from "expo-constants";
import { Platform } from "react-native";

// 推断后端 API Base URL。
// 1) 显式 EXPO_PUBLIC_API_BASE_URL 优先；
// 2) 否则本地开发时从 Metro host 推断（真机用局域网 IP，Web/模拟器用 localhost）。
export function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicit) return explicit;

  const port = 3000;
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      return `http://${window.location.hostname}:${port}`;
    }
    return `http://localhost:${port}`;
  }

  // 从 Expo 的 hostUri（如 192.168.1.10:8081）取主机名
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)
      ?.debuggerHost;
  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}:${port}`;

  return `http://localhost:${port}`;
}
