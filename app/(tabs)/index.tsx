import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "../../components/screen-container";
import { ProteinRing } from "../../components/protein-ring";
import { MacroCard } from "../../components/macro-card";
import { MealRow } from "../../components/meal-row";
import { useDailySummary, useTodayMeals, useDeleteMeal } from "../../lib/data";
import { useAuth } from "../../lib/auth-context";
import { Colors } from "../../constants/theme";

export default function Dashboard() {
  const router = useRouter();
  const { mode } = useAuth();
  const summaryQ = useDailySummary();
  const mealsQ = useTodayMeals();
  const deleteMeal = useDeleteMeal();

  const s = summaryQ.data?.summary;
  const targets = summaryQ.data?.targets;

  return (
    <ScreenContainer>
      <View className="pt-2">
        <Text className="text-2xl font-bold text-primary-800">今天好呀 👋</Text>
        <Text className="mt-1 text-sm text-gray-500">
          先看看蛋白质——这是用药期最重要的指标。
        </Text>
      </View>

      {mode === "local" && (
        <View className="mt-3 rounded-xl bg-amber-50 px-3 py-2">
          <Text className="text-xs text-amber-700">
            本地模式：未连接数据库，数据仅保存在本机。配置 DATABASE_URL 后可云端同步。
          </Text>
        </View>
      )}

      {/* 蛋白质进度环（主指标）*/}
      <View className="mt-4 items-center rounded-3xl bg-white py-6 shadow-sm">
        {summaryQ.isLoading ? (
          <ActivityIndicator color={Colors.primary[500]} />
        ) : (
          <ProteinRing
            current={s?.totalProtein ?? 0}
            target={targets?.protein ?? 100}
          />
        )}
      </View>

      {/* 宏量营养卡片（次要指标）*/}
      <View className="mt-4 flex-row gap-3">
        <MacroCard
          label="热量"
          value={s?.totalCalories ?? 0}
          unit="kcal"
          color={Colors.macro.calories}
        />
        <MacroCard
          label="碳水"
          value={s?.totalCarbs ?? 0}
          unit="g"
          color={Colors.macro.carbs}
        />
      </View>
      <View className="mt-3 flex-row gap-3">
        <MacroCard
          label="脂肪"
          value={s?.totalFat ?? 0}
          unit="g"
          color={Colors.macro.fat}
        />
        <MacroCard
          label="纤维"
          value={s?.totalFiber ?? 0}
          unit="g"
          color={Colors.macro.fiber}
        />
      </View>

      {/* 今日餐食 */}
      <View className="mt-6">
        <Text className="mb-2 text-base font-semibold text-gray-800">今日餐食</Text>
        {mealsQ.data && mealsQ.data.length > 0 ? (
          <>
            {mealsQ.data.map((m) => (
              <MealRow key={m.id} meal={m} onDelete={(id) => deleteMeal.mutate(id)} />
            ))}
            <Text className="mt-1 text-center text-[11px] text-gray-300">
              长按某一餐可删除
            </Text>
          </>
        ) : (
          <View className="items-center rounded-2xl bg-white py-8">
            <Text className="text-sm text-gray-400">还没有记录，拍一餐开始吧</Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={() => router.push("/(tabs)/log")}
        className="mt-6 items-center rounded-2xl bg-primary-500 py-4 active:bg-primary-600"
      >
        <Text className="text-base font-semibold text-white">📷 拍照记录一餐</Text>
      </Pressable>
    </ScreenContainer>
  );
}
