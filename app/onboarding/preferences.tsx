import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useOnboarding } from "./_layout";
import { useUpdateProfile } from "../../lib/data";
import { useAuth } from "../../lib/auth-context";
import { DIETARY_PREFERENCES } from "../../constants/theme";

export default function Preferences() {
  const router = useRouter();
  const { draft, update } = useOnboarding();
  const updateProfile = useUpdateProfile();
  const { completeOnboarding } = useAuth();

  const toggle = (pref: string) => {
    const set = new Set(draft.dietaryPreferences);
    set.has(pref) ? set.delete(pref) : set.add(pref);
    update({ dietaryPreferences: Array.from(set) });
  };

  const finish = async () => {
    try {
      await updateProfile.mutateAsync({
        glp1Drug: draft.glp1Drug,
        dosageStage: draft.dosageStage,
        weightCurrent: draft.weightCurrent,
        weightGoal: draft.weightGoal,
        proteinTarget: draft.proteinTarget ?? 100,
        dietaryPreferences: draft.dietaryPreferences,
      });
    } catch {
      // online 失败也不阻断：onboarding 状态仍标记完成，进入本地模式
    }
    await completeOnboarding();
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <ScrollView contentContainerClassName="px-7 pt-6 pb-4">
        <Text className="text-sm font-medium text-primary-500">第 3 / 3 步</Text>
        <Text className="mt-2 text-2xl font-bold text-primary-800">
          饮食偏好
        </Text>
        <Text className="mt-1 text-sm text-gray-500">
          选择适用的（可多选，也可跳过）。
        </Text>

        <View className="mt-6 flex-row flex-wrap gap-2">
          {DIETARY_PREFERENCES.map((p) => {
            const on = draft.dietaryPreferences.includes(p);
            return (
              <Pressable
                key={p}
                onPress={() => toggle(p)}
                className={`rounded-xl px-4 py-2 ${on ? "bg-primary-500" : "bg-white"}`}
              >
                <Text className={on ? "text-white" : "text-gray-700"}>{p}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="px-7 pb-10">
        <Pressable
          onPress={finish}
          disabled={updateProfile.isPending}
          className="items-center rounded-2xl bg-primary-500 py-4 active:bg-primary-600"
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">完成，进入 Mira</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
