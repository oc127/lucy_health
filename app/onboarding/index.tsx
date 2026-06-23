import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function Welcome() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <View className="flex-1 justify-center px-7">
        <Text className="text-5xl">🌿</Text>
        <Text className="mt-6 text-3xl font-bold text-primary-800">
          嗨，我是 Mira
        </Text>
        <Text className="mt-3 text-base leading-6 text-gray-600">
          一个懂营养的好朋友，专门陪伴正在使用 GLP-1
          药物的你。我不诊断、不评判，只帮你吃够蛋白质、保持平衡，温柔地陪你走过用药期。
        </Text>
        <Text className="mt-4 text-sm text-gray-400">
          接下来用 1 分钟了解你，给你更贴心的建议。
        </Text>
      </View>
      <View className="px-7 pb-10">
        <Pressable
          onPress={() => router.push("/onboarding/medication")}
          className="items-center rounded-2xl bg-primary-500 py-4 active:bg-primary-600"
        >
          <Text className="text-base font-semibold text-white">开始</Text>
        </Pressable>
        <Text className="mt-3 text-center text-[11px] text-gray-400">
          Mira is not a medical service. 不提供医疗建议。
        </Text>
      </View>
    </SafeAreaView>
  );
}
