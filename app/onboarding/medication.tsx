import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useOnboarding } from "./_layout";
import { GLP1_DRUGS, DOSAGE_STAGES } from "../../constants/theme";

export default function Medication() {
  const router = useRouter();
  const { draft, update } = useOnboarding();

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <ScrollView contentContainerClassName="px-7 pt-6 pb-4">
        <Text className="text-sm font-medium text-primary-500">第 1 / 3 步</Text>
        <Text className="mt-2 text-2xl font-bold text-primary-800">
          你在用哪种药？
        </Text>
        <Text className="mt-1 text-sm text-gray-500">
          这帮 Mira 理解你所处的阶段（仅用于个性化，不做医疗判断）。
        </Text>

        <Text className="mt-6 mb-2 text-sm font-semibold text-gray-700">药物</Text>
        <View className="flex-row flex-wrap gap-2">
          {GLP1_DRUGS.map((d) => (
            <Pressable
              key={d}
              onPress={() => update({ glp1Drug: d })}
              className={`rounded-xl px-4 py-2 ${
                draft.glp1Drug === d ? "bg-primary-500" : "bg-white"
              }`}
            >
              <Text
                className={
                  draft.glp1Drug === d ? "text-white" : "text-gray-700"
                }
              >
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="mt-6 mb-2 text-sm font-semibold text-gray-700">
          用药阶段
        </Text>
        <View className="gap-2">
          {DOSAGE_STAGES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => update({ dosageStage: s.key })}
              className={`rounded-xl px-4 py-3 ${
                draft.dosageStage === s.key ? "bg-primary-500" : "bg-white"
              }`}
            >
              <Text
                className={
                  draft.dosageStage === s.key ? "text-white" : "text-gray-700"
                }
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View className="px-7 pb-10">
        <Pressable
          onPress={() => router.push("/onboarding/goals")}
          disabled={!draft.glp1Drug || !draft.dosageStage}
          className={`items-center rounded-2xl py-4 ${
            draft.glp1Drug && draft.dosageStage
              ? "bg-primary-500 active:bg-primary-600"
              : "bg-gray-300"
          }`}
        >
          <Text className="text-base font-semibold text-white">下一步</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
