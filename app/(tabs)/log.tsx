import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ScreenContainer } from "../../components/screen-container";
import { useAnalyzeMeal, useCreateMeal } from "../../lib/data";
import { Colors } from "../../constants/theme";
import type { MealAnalysis } from "../../drizzle/schema";

const MEAL_TYPES = [
  { key: "breakfast", label: "早餐" },
  { key: "lunch", label: "午餐" },
  { key: "dinner", label: "晚餐" },
  { key: "snack", label: "加餐" },
];

const PORTIONS = [0.5, 1, 1.5, 2];

export default function LogMeal() {
  const router = useRouter();
  const analyze = useAnalyzeMeal();
  const createMeal = useCreateMeal();
  const [mealType, setMealType] = useState("lunch");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<MealAnalysis | null>(null);
  const [portion, setPortion] = useState(1);

  const reset = () => {
    setResult(null);
    setImageUri(null);
    setImageData(null);
    setPortion(1);
  };

  const pickFrom = async (source: "camera" | "library") => {
    setResult(null);
    let res: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        // Web 或无相机权限：降级为相册选择
        return pickFrom("library");
      }
      res = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.6,
        mediaTypes: ["images"],
      });
    } else {
      res = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        quality: 0.6,
        mediaTypes: ["images"],
      });
    }
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setImageUri(asset.uri);
    const base64 = asset.base64
      ? `data:image/jpeg;base64,${asset.base64}`
      : asset.uri;
    setImageData(base64);

    try {
      const analysis = await analyze.mutateAsync({
        imageBase64: base64,
        mealType,
      });
      setResult(analysis);
      setPortion(1);
    } catch (e) {
      Alert.alert("分析失败", (e as Error).message);
    }
  };

  const save = async () => {
    if (!result) return;
    try {
      await createMeal.mutateAsync({
        analysis: result,
        mealType,
        portionMultiplier: portion,
        imageUrl: imageData ?? imageUri ?? undefined,
      });
      reset();
      router.push("/(tabs)");
    } catch (e) {
      Alert.alert("保存失败", (e as Error).message);
    }
  };

  const scaled = (v: number) => Math.round(v * portion);

  return (
    <ScreenContainer>
      <View className="pt-2">
        <Text className="text-2xl font-bold text-primary-800">记录一餐</Text>
        <Text className="mt-1 text-sm text-gray-500">
          拍照或选图，Mira 会优先帮你算蛋白质。
        </Text>
      </View>

      {/* 餐次选择 */}
      <View className="mt-4 flex-row gap-2">
        {MEAL_TYPES.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setMealType(t.key)}
            className={`flex-1 items-center rounded-xl py-2 ${
              mealType === t.key ? "bg-primary-500" : "bg-white"
            }`}
          >
            <Text
              className={
                mealType === t.key ? "font-medium text-white" : "text-gray-600"
              }
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 图片预览 */}
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          className="mt-4 h-48 w-full rounded-2xl"
          resizeMode="cover"
        />
      )}

      {/* 拍照 / 选图按钮 */}
      <View className="mt-4 flex-row gap-3">
        <Pressable
          onPress={() => pickFrom("camera")}
          disabled={analyze.isPending}
          className="flex-1 items-center rounded-2xl bg-primary-500 py-4 active:bg-primary-600"
        >
          <Text className="font-semibold text-white">📷 拍照</Text>
        </Pressable>
        <Pressable
          onPress={() => pickFrom("library")}
          disabled={analyze.isPending}
          className="flex-1 items-center rounded-2xl bg-white py-4"
        >
          <Text className="font-semibold text-primary-600">🖼 从相册选</Text>
        </Pressable>
      </View>

      {analyze.isPending && (
        <View className="mt-6 items-center">
          <ActivityIndicator color={Colors.primary[500]} />
          <Text className="mt-2 text-sm text-gray-500">Mira 正在分析…</Text>
        </View>
      )}

      {/* 分析结果 */}
      {result && !analyze.isPending && (
        <View className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <Text className="text-base font-semibold text-gray-800">
            {result.foodItems.join("、")}
          </Text>

          {/* 蛋白质优先展示 */}
          <View className="mt-3 rounded-2xl bg-primary-50 p-4">
            <Text className="text-xs text-gray-500">蛋白质</Text>
            <Text className="text-3xl font-bold text-protein">
              {scaled(result.protein_g)}
              <Text className="text-base font-normal text-gray-400"> g</Text>
            </Text>
          </View>

          <View className="mt-3 flex-row flex-wrap">
            <Macro label="热量" value={`${scaled(result.calories)} kcal`} />
            <Macro label="碳水" value={`${scaled(result.carbs_g)} g`} />
            <Macro label="脂肪" value={`${scaled(result.fat_g)} g`} />
            <Macro label="纤维" value={`${scaled(result.fiber_g)} g`} />
          </View>

          {/* 份量修正：估份量是最难的一环，让用户一键调整重算 */}
          <Text className="mt-4 text-xs text-gray-500">
            份量假设：{result.portionAssumption}（置信度：{result.confidence}）
          </Text>
          <Text className="mt-2 text-xs font-medium text-gray-600">
            觉得不准？调整份量重算：
          </Text>
          <View className="mt-2 flex-row gap-2">
            {PORTIONS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPortion(p)}
                className={`flex-1 items-center rounded-lg py-2 ${
                  portion === p ? "bg-primary-500" : "bg-gray-100"
                }`}
              >
                <Text
                  className={
                    portion === p ? "text-white" : "text-gray-600"
                  }
                >
                  {p} 份
                </Text>
              </Pressable>
            ))}
          </View>

          {result.notes ? (
            <View className="mt-4 rounded-2xl bg-primary-50 p-3">
              <Text className="text-sm text-primary-700">💬 {result.notes}</Text>
            </View>
          ) : null}

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={reset}
              className="items-center justify-center rounded-2xl bg-gray-100 px-5 py-3"
            >
              <Text className="font-semibold text-gray-500">丢弃</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={createMeal.isPending}
              className="flex-1 items-center rounded-2xl bg-primary-500 py-3 active:bg-primary-600"
            >
              <Text className="font-semibold text-white">
                {createMeal.isPending ? "保存中…" : `保存（${portion} 份）`}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 py-1">
      <Text className="text-xs text-gray-400">{label}</Text>
      <Text className="font-semibold text-gray-700">{value}</Text>
    </View>
  );
}
