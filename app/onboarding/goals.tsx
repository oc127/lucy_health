import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useOnboarding } from "./_layout";

export default function Goals() {
  const router = useRouter();
  const { draft, update } = useOnboarding();

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <ScrollView contentContainerClassName="px-7 pt-6 pb-4">
        <Text className="text-sm font-medium text-primary-500">第 2 / 3 步</Text>
        <Text className="mt-2 text-2xl font-bold text-primary-800">
          设定你的目标
        </Text>
        <Text className="mt-1 text-sm text-gray-500">
          蛋白质目标默认 100g/天——用药期保肌肉的关键。
        </Text>

        <Field
          label="当前体重（磅）"
          value={draft.weightCurrent}
          onChange={(n) => update({ weightCurrent: n })}
          placeholder="例如 180"
        />
        <Field
          label="目标体重（磅）"
          value={draft.weightGoal}
          onChange={(n) => update({ weightGoal: n })}
          placeholder="例如 150"
        />
        <Field
          label="每日蛋白质目标（克）"
          value={draft.proteinTarget}
          onChange={(n) => update({ proteinTarget: n })}
          placeholder="100"
        />
      </ScrollView>

      <View className="px-7 pb-10">
        <Pressable
          onPress={() => router.push("/onboarding/preferences")}
          className="items-center rounded-2xl bg-primary-500 py-4 active:bg-primary-600"
        >
          <Text className="text-base font-semibold text-white">下一步</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: number;
  onChange: (n: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-sm font-semibold text-gray-700">{label}</Text>
      <TextInput
        keyboardType="numeric"
        placeholder={placeholder}
        defaultValue={value != null ? String(value) : ""}
        onChangeText={(t) => {
          const n = parseFloat(t);
          onChange(Number.isFinite(n) ? n : undefined);
        }}
        className="rounded-xl bg-white px-4 py-3 text-gray-800"
      />
    </View>
  );
}
