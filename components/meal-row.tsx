import { View, Text, Pressable, Alert } from "react-native";
import { Image } from "expo-image";
import type { MealListItem } from "../lib/data";

type Props = {
  meal: MealListItem;
  onDelete?: (id: number) => void;
};

// 餐食行：缩略图 + 食物 + 蛋白质，长按删除。dashboard 与历史页共用。
export function MealRow({ meal: m, onDelete }: Props) {
  const confirmDelete = () => {
    if (!onDelete) return;
    Alert.alert("删除这一餐？", m.foodItems.join("、") || "餐食", [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => onDelete(m.id) },
    ]);
  };

  return (
    <Pressable
      onLongPress={confirmDelete}
      delayLongPress={300}
      className="mb-2 flex-row items-center rounded-2xl bg-white px-3 py-2.5 shadow-sm"
    >
      {m.imageUrl ? (
        <Image
          source={{ uri: m.imageUrl }}
          style={{ width: 44, height: 44, borderRadius: 10 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-[10px] bg-primary-50">
          <Text>🍽</Text>
        </View>
      )}
      <View className="flex-1 px-3">
        <Text className="font-medium text-gray-800" numberOfLines={1}>
          {m.foodItems.join("、") || "餐食"}
        </Text>
        <Text className="text-xs text-gray-400">
          {m.mealType ?? "餐食"} · {Math.round(m.calories)} kcal
          {m.portionMultiplier !== 1 ? ` · ${m.portionMultiplier} 份` : ""}
        </Text>
      </View>
      <Text className="font-bold text-protein">{Math.round(m.proteinG)}g</Text>
    </Pressable>
  );
}
