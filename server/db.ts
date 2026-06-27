import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { DbClient } from "./_core/db";
import { schema } from "./_core/db";
import type { MealAnalysis } from "../drizzle/schema";

// ---- 用户档案 ----
export async function getProfile(db: DbClient, userId: number) {
  const rows = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export type ProfileUpdate = Partial<{
  glp1Drug: string;
  dosageStage: string;
  weightCurrent: number;
  weightGoal: number;
  dietaryPreferences: string[];
  proteinTarget: number;
  calorieTarget: number;
}>;

export async function upsertProfile(
  db: DbClient,
  userId: number,
  patch: ProfileUpdate,
) {
  const existing = await getProfile(db, userId);
  if (existing) {
    const rows = await db
      .update(schema.userProfiles)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.userProfiles.userId, userId))
      .returning();
    return rows[0];
  }
  const rows = await db
    .insert(schema.userProfiles)
    .values({ userId, ...patch })
    .returning();
  return rows[0];
}

// ---- 餐食 ----
export async function insertMeal(
  db: DbClient,
  userId: number,
  data: {
    imageUrl?: string;
    mealType?: string;
    analysis: MealAnalysis;
    portionMultiplier?: number;
  },
) {
  const a = data.analysis;
  const rows = await db
    .insert(schema.meals)
    .values({
      userId,
      imageUrl: data.imageUrl,
      mealType: data.mealType,
      analysisJson: a,
      calories: a.calories,
      proteinG: a.protein_g,
      fiberG: a.fiber_g,
      carbsG: a.carbs_g,
      fatG: a.fat_g,
      foodItems: a.foodItems,
      portionMultiplier: data.portionMultiplier ?? 1,
    })
    .returning();
  return rows[0];
}

// 删除一餐（限本人）
export async function deleteMeal(db: DbClient, userId: number, id: number) {
  await db
    .delete(schema.meals)
    .where(and(eq(schema.meals.id, id), eq(schema.meals.userId, userId)));
  return { id };
}

// 修改份量倍数（限本人）——「份量可修正」真正回写
export async function updateMealPortion(
  db: DbClient,
  userId: number,
  id: number,
  portionMultiplier: number,
) {
  const rows = await db
    .update(schema.meals)
    .set({ portionMultiplier })
    .where(and(eq(schema.meals.id, id), eq(schema.meals.userId, userId)))
    .returning();
  return rows[0];
}

export async function getMealsByDay(
  db: DbClient,
  userId: number,
  day: Date,
) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  return db
    .select()
    .from(schema.meals)
    .where(
      and(
        eq(schema.meals.userId, userId),
        gte(schema.meals.createdAt, start),
        lte(schema.meals.createdAt, end),
      ),
    )
    .orderBy(desc(schema.meals.createdAt));
}

// 纯函数：把餐食列表 + 目标聚合为当日汇总（蛋白质缺口 = 目标 - 实际，最小 0）。
// 抽成纯函数便于单测，getDailySummary 与本地降级模式共用同一套逻辑。
export type SummarizableMeal = {
  calories?: number | null;
  proteinG?: number | null;
  fiberG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  portionMultiplier?: number | null;
};

export function computeSummary(
  meals: SummarizableMeal[],
  proteinTarget: number,
  calorieTarget: number,
) {
  const sum = meals.reduce<{
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
  }>(
    (acc, m) => {
      const mult = m.portionMultiplier ?? 1;
      acc.calories += (m.calories ?? 0) * mult;
      acc.protein += (m.proteinG ?? 0) * mult;
      acc.fiber += (m.fiberG ?? 0) * mult;
      acc.carbs += (m.carbsG ?? 0) * mult;
      acc.fat += (m.fatG ?? 0) * mult;
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
      proteinGap: Math.max(0, Math.round(proteinTarget - sum.protein)),
    },
    targets: { protein: proteinTarget, calories: calorieTarget },
    mealCount: meals.length,
  };
}

// 当日宏量汇总 + 与目标对比
export async function getDailySummary(
  db: DbClient,
  userId: number,
  day: Date,
) {
  const [profile, meals] = await Promise.all([
    getProfile(db, userId),
    getMealsByDay(db, userId, day),
  ]);
  return computeSummary(
    meals,
    profile?.proteinTarget ?? 100,
    profile?.calorieTarget ?? 1800,
  );
}

// ---- 餐食历史（最近 N 天，按时间倒序）----
export async function getMealHistory(
  db: DbClient,
  userId: number,
  days = 14,
) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  return db
    .select()
    .from(schema.meals)
    .where(
      and(
        eq(schema.meals.userId, userId),
        gte(schema.meals.createdAt, since),
      ),
    )
    .orderBy(desc(schema.meals.createdAt));
}

// ---- 营养趋势：最近 N 天每天的蛋白质 / 热量汇总 ----
export type TrendPoint = {
  date: string; // YYYY-MM-DD
  protein: number;
  calories: number;
};

export function buildTrend(
  meals: {
    createdAt: Date;
    proteinG?: number | null;
    calories?: number | null;
    portionMultiplier?: number | null;
  }[],
  days: number,
): TrendPoint[] {
  const byDay = new Map<string, { protein: number; calories: number }>();
  // 预填最近 days 天（含今天），保证趋势连续
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    byDay.set(toDateKey(d), { protein: 0, calories: 0 });
  }
  for (const m of meals) {
    const key = toDateKey(new Date(m.createdAt));
    const bucket = byDay.get(key);
    if (!bucket) continue;
    const mult = m.portionMultiplier ?? 1;
    bucket.protein += (m.proteinG ?? 0) * mult;
    bucket.calories += (m.calories ?? 0) * mult;
  }
  return Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    protein: Math.round(v.protein),
    calories: Math.round(v.calories),
  }));
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getTrend(db: DbClient, userId: number, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const meals = await db
    .select({
      createdAt: schema.meals.createdAt,
      proteinG: schema.meals.proteinG,
      calories: schema.meals.calories,
      portionMultiplier: schema.meals.portionMultiplier,
    })
    .from(schema.meals)
    .where(
      and(eq(schema.meals.userId, userId), gte(schema.meals.createdAt, since)),
    );
  return buildTrend(meals, days);
}

// ---- 体重记录 ----
export async function addWeight(
  db: DbClient,
  userId: number,
  weightLb: number,
  note?: string,
) {
  const rows = await db
    .insert(schema.weights)
    .values({ userId, weightLb, note })
    .returning();
  // 同步更新档案里的当前体重
  await db
    .update(schema.userProfiles)
    .set({ weightCurrent: weightLb, updatedAt: new Date() })
    .where(eq(schema.userProfiles.userId, userId));
  return rows[0];
}

export async function listWeights(db: DbClient, userId: number, limit = 60) {
  return db
    .select()
    .from(schema.weights)
    .where(eq(schema.weights.userId, userId))
    .orderBy(desc(schema.weights.recordedAt))
    .limit(limit);
}

// ---- 聊天记录 ----
export async function addChatMessage(
  db: DbClient,
  userId: number,
  role: "user" | "assistant",
  content: string,
  flagged?: string,
) {
  const rows = await db
    .insert(schema.chatMessages)
    .values({ userId, role, content, flagged })
    .returning();
  return rows[0];
}

export async function getChatHistory(
  db: DbClient,
  userId: number,
  limit = 50,
) {
  const rows = await db
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.userId, userId))
    .orderBy(desc(schema.chatMessages.createdAt))
    .limit(limit);
  return rows.reverse(); // 返回时按时间正序
}
