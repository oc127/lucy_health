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
    })
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
