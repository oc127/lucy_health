import AsyncStorage from "@react-native-async-storage/async-storage";
import { vanillaTrpc } from "./trpc";
import * as local from "./local-store";

const MIGRATED_KEY = "mira.migratedToCloud";

// 把本地（离线）累积的数据迁移到云端。
// 在首次成功的 online 认证后调用：避免用户离线记录的餐/体重/档案在切到云端后"消失"。
// 全部推送成功后才清空本地并打标记；失败则保留本地，下次启动重试。
export async function migrateLocalToCloud(): Promise<{
  migratedMeals: number;
  migratedWeights: number;
} | null> {
  const done = await AsyncStorage.getItem(MIGRATED_KEY);
  if (done === "true") return null;

  const [profile, meals, weights] = await Promise.all([
    local.getLocalProfile(),
    local.getLocalMealHistory(3650), // 取全部（约 10 年窗口）
    local.listLocalWeights(),
  ]);

  // 没有任何本地数据：直接标记完成，避免每次启动重复检查。
  const hasData =
    meals.length > 0 ||
    weights.length > 0 ||
    profile.glp1Drug != null ||
    profile.weightGoal != null;
  if (!hasData) {
    await AsyncStorage.setItem(MIGRATED_KEY, "true");
    return null;
  }

  // 1) 档案
  await vanillaTrpc.profile.update.mutate({
    glp1Drug: profile.glp1Drug,
    dosageStage: profile.dosageStage,
    weightCurrent: profile.weightCurrent,
    weightGoal: profile.weightGoal,
    dietaryPreferences: profile.dietaryPreferences,
    proteinTarget: profile.proteinTarget,
    calorieTarget: profile.calorieTarget,
  });

  // 2) 餐食（按时间正序写入，尽量还原顺序）
  for (const m of [...meals].reverse()) {
    await vanillaTrpc.meals.create.mutate({
      analysis: m.analysis,
      mealType: m.mealType,
      portionMultiplier: m.portionMultiplier ?? 1,
      imageUrl: m.imageUrl,
    });
  }

  // 3) 体重
  for (const w of [...weights].reverse()) {
    await vanillaTrpc.weights.add.mutate({
      weightLb: w.weightLb,
      note: w.note,
    });
  }

  // 全部成功 → 清空本地并打标记
  await local.clearLocalData();
  await AsyncStorage.setItem(MIGRATED_KEY, "true");

  return { migratedMeals: meals.length, migratedWeights: weights.length };
}
