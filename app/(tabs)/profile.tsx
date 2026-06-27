import { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "../../components/screen-container";
import { useProfile, useUpdateProfile } from "../../lib/data";
import { useAuth } from "../../lib/auth-context";

export default function Profile() {
  const router = useRouter();
  const { mode, reset } = useAuth();
  const profileQ = useProfile();
  const updateProfile = useUpdateProfile();

  const [protein, setProtein] = useState("");
  const [calories, setCalories] = useState("");
  const [goal, setGoal] = useState("");

  useEffect(() => {
    if (profileQ.data) {
      setProtein(String(profileQ.data.proteinTarget));
      setCalories(String(profileQ.data.calorieTarget));
      setGoal(profileQ.data.weightGoal != null ? String(profileQ.data.weightGoal) : "");
    }
  }, [profileQ.data]);

  const save = async () => {
    await updateProfile.mutateAsync({
      proteinTarget: parseFloat(protein) || 100,
      calorieTarget: parseFloat(calories) || 1800,
      weightGoal: goal ? parseFloat(goal) : undefined,
    });
    Alert.alert("已保存", "你的目标已更新 ✅");
  };

  const onReset = () => {
    Alert.alert("重新开始？", "将清除本地登录与引导状态。", [
      { text: "取消", style: "cancel" },
      {
        text: "确认",
        style: "destructive",
        onPress: async () => {
          await reset();
          router.replace("/onboarding");
        },
      },
    ]);
  };

  const p = profileQ.data;

  return (
    <ScreenContainer>
      <View className="pt-2">
        <Text className="text-2xl font-bold text-primary-800">我的</Text>
        <Text className="mt-1 text-sm text-gray-500">
          {mode === "online" ? "已连接云端" : "本地模式（未连数据库）"}
        </Text>
      </View>

      {/* 用药信息 */}
      <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <Text className="mb-2 text-base font-semibold text-gray-800">用药信息</Text>
        <Row label="药物" value={p?.glp1Drug ?? "未填写"} />
        <Row label="阶段" value={p?.dosageStage ?? "未填写"} />
        <Row
          label="饮食偏好"
          value={
            p && p.dietaryPreferences.length > 0
              ? p.dietaryPreferences.join("、")
              : "无"
          }
        />
      </View>

      {/* 目标编辑 */}
      <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <Text className="mb-2 text-base font-semibold text-gray-800">我的目标</Text>
        <Field label="每日蛋白质目标（克）" value={protein} onChange={setProtein} />
        <Field label="每日热量目标（千卡）" value={calories} onChange={setCalories} />
        <Field label="目标体重（磅）" value={goal} onChange={setGoal} />
        <Pressable
          onPress={save}
          disabled={updateProfile.isPending}
          className="mt-3 items-center rounded-2xl bg-primary-500 py-3 active:bg-primary-600"
        >
          <Text className="font-semibold text-white">
            {updateProfile.isPending ? "保存中…" : "保存目标"}
          </Text>
        </Pressable>
      </View>

      {/* 入口 */}
      <View className="mt-4 rounded-3xl bg-white p-2 shadow-sm">
        <LinkRow
          label="📜 餐食历史"
          onPress={() => router.push("/meal-history")}
        />
        <LinkRow
          label="✨ Mira Plus（订阅）"
          onPress={() => router.push("/paywall")}
        />
      </View>

      <Pressable onPress={onReset} className="mt-6 items-center py-3">
        <Text className="text-sm text-gray-400">重新开始 / 退出</Text>
      </Pressable>
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-medium text-gray-800">{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <View className="mt-2">
      <Text className="mb-1 text-xs text-gray-500">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        className="rounded-xl bg-primary-50 px-4 py-2.5 text-gray-800"
      />
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-2xl px-3 py-3 active:bg-gray-50"
    >
      <Text className="text-base text-gray-700">{label}</Text>
      <Text className="text-gray-300">›</Text>
    </Pressable>
  );
}
