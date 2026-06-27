import { View, Text, Pressable, SectionList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMealHistory, type HistoryMeal } from "../lib/data";
import { Colors } from "../constants/theme";

// 按天分组餐食历史
function groupByDay(meals: HistoryMeal[]) {
  const map = new Map<string, HistoryMeal[]>();
  for (const m of meals) {
    const key = new Date(m.createdAt).toLocaleDateString();
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([title, data]) => ({
    title,
    data,
    protein: Math.round(data.reduce((s, m) => s + m.proteinG, 0)),
  }));
}

export default function MealHistory() {
  const router = useRouter();
  const historyQ = useMealHistory(30);
  const sections = groupByDay(historyQ.data ?? []);

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <View className="flex-row items-center border-b border-gray-100 px-4 py-3">
        <Pressable onPress={() => router.back()} className="pr-3">
          <Text className="text-lg text-primary-600">‹ 返回</Text>
        </Pressable>
        <Text className="text-lg font-bold text-primary-800">餐食历史</Text>
      </View>

      {historyQ.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.primary[500]} />
        </View>
      ) : sections.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-gray-400">最近 30 天还没有记录</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16 }}
          renderSectionHeader={({ section }) => (
            <View className="mb-1 mt-3 flex-row justify-between">
              <Text className="text-sm font-semibold text-gray-700">
                {section.title}
              </Text>
              <Text className="text-xs text-protein">
                共 {section.protein}g 蛋白
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View className="mb-2 flex-row items-center justify-between rounded-2xl bg-white px-4 py-3">
              <View className="flex-1 pr-2">
                <Text className="font-medium text-gray-800" numberOfLines={1}>
                  {item.foodItems.join("、") || "餐食"}
                </Text>
                <Text className="text-xs text-gray-400">
                  {item.mealType ?? "餐食"} · {Math.round(item.calories)} kcal
                </Text>
              </View>
              <Text className="font-bold text-protein">
                {Math.round(item.proteinG)}g
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
