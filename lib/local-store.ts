import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MealAnalysis } from "../drizzle/schema";

// 数据库不可用时的本地降级存储（AsyncStorage）。结构与后端返回保持一致。
const PROFILE_KEY = "mira.local.profile";
const MEALS_KEY = "mira.local.meals";

export type LocalProfile = {
  glp1Drug?: string;
  dosageStage?: string;
  weightCurrent?: number;
  weightGoal?: number;
  dietaryPreferences: string[];
  proteinTarget: number;
  calorieTarget: number;
};

export type LocalMeal = {
  id: number;
  mealType?: string;
  analysis: MealAnalysis;
  createdAt: string; // ISO
};

const DEFAULT_PROFILE: LocalProfile = {
  dietaryPreferences: [],
  proteinTarget: 100,
  calorieTarget: 1800,
};

export async function getLocalProfile(): Promise<LocalProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
}

export async function saveLocalProfile(
  patch: Partial<LocalProfile>,
): Promise<LocalProfile> {
  const current = await getLocalProfile();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  return next;
}

async function readMeals(): Promise<LocalMeal[]> {
  const raw = await AsyncStorage.getItem(MEALS_KEY);
  return raw ? (JSON.parse(raw) as LocalMeal[]) : [];
}

export async function addLocalMeal(
  analysis: MealAnalysis,
  mealType?: string,
): Promise<LocalMeal> {
  const meals = await readMeals();
  const meal: LocalMeal = {
    id: Date.now(),
    mealType,
    analysis,
    createdAt: new Date().toISOString(),
  };
  meals.unshift(meal);
  // 只保留最近 200 条，避免无限增长
  await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(meals.slice(0, 200)));
  return meal;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function getLocalTodayMeals(day = new Date()): Promise<LocalMeal[]> {
  const meals = await readMeals();
  return meals.filter((m) => isSameDay(new Date(m.createdAt), day));
}

export async function getLocalDailySummary(day = new Date()) {
  const [profile, meals] = await Promise.all([
    getLocalProfile(),
    getLocalTodayMeals(day),
  ]);
  const sum = meals.reduce(
    (acc, m) => {
      acc.calories += m.analysis.calories;
      acc.protein += m.analysis.protein_g;
      acc.fiber += m.analysis.fiber_g;
      acc.carbs += m.analysis.carbs_g;
      acc.fat += m.analysis.fat_g;
      return acc;
    },
    { calories: 0, protein: 0, fiber: 0, carbs: 0, fat: 0 },
  );
  return {
    summary: {
      totalCalories: Math.round(sum.calories),
      totalProtein: Math.round(sum.protein),
      totalFiber: Math.round(sum.fiber),
      totalCarbs: Math.round(sum.carbs),
      totalFat: Math.round(sum.fat),
      proteinGap: Math.max(0, Math.round(profile.proteinTarget - sum.protein)),
    },
    targets: { protein: profile.proteinTarget, calories: profile.calorieTarget },
    mealCount: meals.length,
  };
}
