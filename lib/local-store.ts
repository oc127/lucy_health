import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MealAnalysis } from "../drizzle/schema";

// 数据库不可用时的本地降级存储（AsyncStorage）。结构与后端返回保持一致。
const PROFILE_KEY = "mira.local.profile";
const MEALS_KEY = "mira.local.meals";
const WEIGHTS_KEY = "mira.local.weights";
const CHAT_KEY = "mira.local.chat";

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
  portionMultiplier: number;
  imageUrl?: string;
  createdAt: string; // ISO
};

const DEFAULT_PROFILE: LocalProfile = {
  dietaryPreferences: [],
  proteinTarget: 100,
  calorieTarget: 1800,
};

// 迁移到云端后清空本地业务数据（保留 deviceId / onboarding 等会话状态）。
export async function clearLocalData(): Promise<void> {
  await AsyncStorage.multiRemove([PROFILE_KEY, MEALS_KEY, WEIGHTS_KEY, CHAT_KEY]);
}

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
  opts?: { mealType?: string; portionMultiplier?: number; imageUrl?: string },
): Promise<LocalMeal> {
  const meals = await readMeals();
  const meal: LocalMeal = {
    id: Date.now(),
    mealType: opts?.mealType,
    analysis,
    portionMultiplier: opts?.portionMultiplier ?? 1,
    imageUrl: opts?.imageUrl,
    createdAt: new Date().toISOString(),
  };
  meals.unshift(meal);
  // 只保留最近 200 条，避免无限增长
  await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(meals.slice(0, 200)));
  return meal;
}

export async function deleteLocalMeal(id: number): Promise<void> {
  const meals = await readMeals();
  await AsyncStorage.setItem(
    MEALS_KEY,
    JSON.stringify(meals.filter((m) => m.id !== id)),
  );
}

export async function updateLocalMealPortion(
  id: number,
  portionMultiplier: number,
): Promise<void> {
  const meals = await readMeals();
  const next = meals.map((m) =>
    m.id === id ? { ...m, portionMultiplier } : m,
  );
  await AsyncStorage.setItem(MEALS_KEY, JSON.stringify(next));
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
      const mult = m.portionMultiplier ?? 1;
      acc.calories += m.analysis.calories * mult;
      acc.protein += m.analysis.protein_g * mult;
      acc.fiber += m.analysis.fiber_g * mult;
      acc.carbs += m.analysis.carbs_g * mult;
      acc.fat += m.analysis.fat_g * mult;
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

// ---- 本地：餐食历史 ----
export async function getLocalMealHistory(days = 14): Promise<LocalMeal[]> {
  const meals = await readMeals();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return meals.filter((m) => new Date(m.createdAt) >= since);
}

// ---- 本地：营养趋势 ----
export type LocalTrendPoint = { date: string; protein: number; calories: number };

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function getLocalTrend(days = 7): Promise<LocalTrendPoint[]> {
  const meals = await readMeals();
  const byDay = new Map<string, { protein: number; calories: number }>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    byDay.set(toKey(d), { protein: 0, calories: 0 });
  }
  for (const m of meals) {
    const bucket = byDay.get(toKey(new Date(m.createdAt)));
    if (!bucket) continue;
    const mult = m.portionMultiplier ?? 1;
    bucket.protein += m.analysis.protein_g * mult;
    bucket.calories += m.analysis.calories * mult;
  }
  return Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    protein: Math.round(v.protein),
    calories: Math.round(v.calories),
  }));
}

// ---- 本地：体重 ----
export type LocalWeight = {
  id: number;
  weightLb: number;
  note?: string;
  recordedAt: string;
};

export async function listLocalWeights(): Promise<LocalWeight[]> {
  const raw = await AsyncStorage.getItem(WEIGHTS_KEY);
  return raw ? (JSON.parse(raw) as LocalWeight[]) : [];
}

export async function addLocalWeight(
  weightLb: number,
  note?: string,
): Promise<LocalWeight> {
  const list = await listLocalWeights();
  const w: LocalWeight = {
    id: Date.now(),
    weightLb,
    note,
    recordedAt: new Date().toISOString(),
  };
  list.unshift(w);
  await AsyncStorage.setItem(WEIGHTS_KEY, JSON.stringify(list.slice(0, 200)));
  await saveLocalProfile({ weightCurrent: weightLb });
  return w;
}

// ---- 本地：聊天 ----
export type LocalChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  flagged?: string;
  createdAt: string;
};

export async function getLocalChat(): Promise<LocalChatMessage[]> {
  const raw = await AsyncStorage.getItem(CHAT_KEY);
  return raw ? (JSON.parse(raw) as LocalChatMessage[]) : [];
}

export async function appendLocalChat(
  msg: Omit<LocalChatMessage, "id" | "createdAt">,
): Promise<LocalChatMessage> {
  const list = await getLocalChat();
  const full: LocalChatMessage = {
    ...msg,
    id: Date.now() + Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString(),
  };
  list.push(full);
  await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(list.slice(-200)));
  return full;
}
