import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../constants/theme";

const PLUS_FEATURES = [
  "无限次 AI 餐食分析",
  "Mira 深度营养对话",
  "个性化蛋白质 & 补水计划",
  "完整趋势报告与导出",
];

// Mira Plus 订阅墙。
// 注意：真实订阅需接入 RevenueCat（react-native-purchases），需要 App Store / Play 凭证，
// 故此处为 UI 占位。接入点：替换 subscribe() 内的逻辑为 Purchases.purchasePackage(...)。
export default function Paywall() {
  const router = useRouter();

  const subscribe = () => {
    Alert.alert(
      "Mira Plus",
      "订阅功能即将上线（接入 RevenueCat 后启用）。感谢你的支持 💚",
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-lg text-primary-600">‹ 返回</Text>
        </Pressable>
      </View>

      <View className="flex-1 px-7 pt-4">
        <Text className="text-4xl">✨</Text>
        <Text className="mt-4 text-3xl font-bold text-primary-800">Mira Plus</Text>
        <Text className="mt-2 text-base text-gray-600">
          解锁完整的营养陪伴，更好地走过用药期。
        </Text>

        <View className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
          {PLUS_FEATURES.map((f) => (
            <View key={f} className="flex-row items-center py-2">
              <Text style={{ color: Colors.primary[500] }} className="mr-2">
                ✓
              </Text>
              <Text className="text-gray-700">{f}</Text>
            </View>
          ))}
        </View>

        <View className="mt-6 rounded-3xl border border-primary-200 bg-white p-5">
          <Text className="text-center text-sm text-gray-500">月度订阅</Text>
          <Text className="text-center text-3xl font-bold text-primary-700">
            ¥38
            <Text className="text-base font-normal text-gray-400"> / 月</Text>
          </Text>
          <Text className="mt-1 text-center text-xs text-gray-400">
            7 天免费试用 · 随时取消
          </Text>
        </View>
      </View>

      <View className="px-7 pb-10">
        <Pressable
          onPress={subscribe}
          className="items-center rounded-2xl bg-primary-500 py-4 active:bg-primary-600"
        >
          <Text className="text-base font-semibold text-white">开始免费试用</Text>
        </Pressable>
        <Text className="mt-3 text-center text-[11px] text-gray-400">
          Mira is not a medical service. 不提供医疗建议。
        </Text>
      </View>
    </SafeAreaView>
  );
}
