import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ScreenContainer } from "../../components/screen-container";
import { TrendChart } from "../../components/trend-chart";
import { useTrend, useWeights, useAddWeight, useProfile } from "../../lib/data";
import { Colors } from "../../constants/theme";

export default function Trends() {
  const profileQ = useProfile();
  const trendQ = useTrend(7);
  const weightsQ = useWeights();
  const addWeight = useAddWeight();
  const [weightInput, setWeightInput] = useState("");

  const target = profileQ.data?.proteinTarget ?? 100;
  const weights = weightsQ.data ?? [];
  const latest = weights[0]?.weightLb;
  const goal = profileQ.data?.weightGoal ?? null;

  const submitWeight = async () => {
    const n = parseFloat(weightInput);
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("请输入有效体重");
      return;
    }
    await addWeight.mutateAsync({ weightLb: n });
    setWeightInput("");
  };

  return (
    <ScreenContainer>
      <View className="pt-2">
        <Text className="text-2xl font-bold text-primary-800">趋势</Text>
        <Text className="mt-1 text-sm text-gray-500">
          看看这一周的蛋白质和体重变化。
        </Text>
      </View>

      {/* 蛋白质 7 日趋势 */}
      <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <Text className="mb-3 text-base font-semibold text-gray-800">
          蛋白质 · 近 7 天
        </Text>
        {trendQ.isLoading || !trendQ.data ? (
          <ActivityIndicator color={Colors.primary[500]} />
        ) : (
          <TrendChart data={trendQ.data} target={target} />
        )}
      </View>

      {/* 体重 */}
      <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-base font-semibold text-gray-800">体重</Text>
          {latest != null && (
            <Text className="text-sm text-gray-500">
              最新 {latest} 磅
              {goal != null ? ` · 目标 ${goal} 磅` : ""}
            </Text>
          )}
        </View>

        <View className="mt-3 flex-row gap-2">
          <TextInput
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="numeric"
            placeholder="记录今天的体重（磅）"
            className="flex-1 rounded-xl bg-primary-50 px-4 py-3 text-gray-800"
          />
          <Pressable
            onPress={submitWeight}
            disabled={addWeight.isPending}
            className="items-center justify-center rounded-xl bg-primary-500 px-5 active:bg-primary-600"
          >
            {addWeight.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold text-white">记录</Text>
            )}
          </Pressable>
        </View>

        {/* 最近体重列表 */}
        <View className="mt-3">
          {weights.slice(0, 6).map((w) => (
            <View
              key={w.id}
              className="flex-row justify-between border-b border-gray-50 py-2"
            >
              <Text className="text-sm text-gray-600">
                {new Date(w.recordedAt).toLocaleDateString()}
              </Text>
              <Text className="text-sm font-medium text-gray-800">
                {w.weightLb} 磅
              </Text>
            </View>
          ))}
          {weights.length === 0 && (
            <Text className="py-3 text-center text-sm text-gray-400">
              还没有体重记录
            </Text>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
