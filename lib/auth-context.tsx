import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "../constants/oauth";
import { setStoredToken, clearStoredToken } from "./trpc";

const DEVICE_KEY = "mira.deviceId";
const ONBOARD_KEY = "mira.onboardingComplete";

type AuthMode = "online" | "local"; // local = 数据库不可用时的降级模式

type AuthState = {
  isReady: boolean;
  mode: AuthMode;
  onboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
  reset: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function genDeviceId(): string {
  return (
    "dev_" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = genDeviceId();
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [mode, setMode] = useState<AuthMode>("local");
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    (async () => {
      const [deviceId, onboard] = await Promise.all([
        getOrCreateDeviceId(),
        AsyncStorage.getItem(ONBOARD_KEY),
      ]);
      setOnboardingComplete(onboard === "true");

      // 尝试用 deviceId 换取 JWT；失败则降级为本地模式
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/device`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });
        if (res.ok) {
          const data = (await res.json()) as { token: string };
          await setStoredToken(data.token);
          setMode("online");
          // 上线后把离线累积的数据迁移到云端（失败不阻断启动，下次重试）。
          try {
            const { migrateLocalToCloud } = await import("./migrate");
            await migrateLocalToCloud();
          } catch (e) {
            console.warn("[migrate] 本地数据迁移失败，将在下次启动重试", e);
          }
        } else {
          setMode("local");
        }
      } catch {
        setMode("local");
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARD_KEY, "true");
    setOnboardingComplete(true);
  }, []);

  const reset = useCallback(async () => {
    await AsyncStorage.multiRemove([ONBOARD_KEY]);
    await clearStoredToken();
    setOnboardingComplete(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ isReady, mode, onboardingComplete, completeOnboarding, reset }),
    [isReady, mode, onboardingComplete, completeOnboarding, reset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
