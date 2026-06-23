import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { Colors } from "../constants/theme";

// 入口：等待 auth 就绪后，按 onboarding 状态分流。
export default function Index() {
  const { isReady, onboardingComplete } = useAuth();

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-primary-50">
        <ActivityIndicator color={Colors.primary[500]} size="large" />
      </View>
    );
  }

  return (
    <Redirect href={onboardingComplete ? "/(tabs)" : "/onboarding"} />
  );
}
