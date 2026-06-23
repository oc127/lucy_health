import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-context";
import { vanillaTrpc } from "./trpc";
import * as local from "./local-store";
import type { ProfileUpdate } from "../server/db";

// 统一数据层：屏蔽 online（tRPC/DB）与 local（AsyncStorage 降级）差异。

export function useDailySummary() {
  const { mode, isReady } = useAuth();
  return useQuery({
    queryKey: ["dailySummary", mode],
    enabled: isReady,
    queryFn: () =>
      mode === "online"
        ? vanillaTrpc.meals.dailySummary.query({})
        : local.getLocalDailySummary(),
  });
}

export function useTodayMeals() {
  const { mode, isReady } = useAuth();
  return useQuery({
    queryKey: ["todayMeals", mode],
    enabled: isReady,
    queryFn: async () => {
      if (mode === "online") {
        const rows = await vanillaTrpc.meals.today.query({});
        return rows.map((m) => ({
          id: m.id,
          mealType: m.mealType ?? undefined,
          foodItems: m.foodItems ?? [],
          calories: m.calories ?? 0,
          proteinG: m.proteinG ?? 0,
          createdAt: m.createdAt,
        }));
      }
      const rows = await local.getLocalTodayMeals();
      return rows.map((m) => ({
        id: m.id,
        mealType: m.mealType,
        foodItems: m.analysis.foodItems,
        calories: m.analysis.calories,
        proteinG: m.analysis.protein_g,
        createdAt: new Date(m.createdAt),
      }));
    },
  });
}

// 统一档案视图（屏蔽 DB 行与本地存储的字段差异）
export type ProfileView = {
  glp1Drug: string | null;
  dosageStage: string | null;
  weightCurrent: number | null;
  weightGoal: number | null;
  dietaryPreferences: string[];
  proteinTarget: number;
  calorieTarget: number;
};

export function useProfile() {
  const { mode, isReady } = useAuth();
  return useQuery<ProfileView>({
    queryKey: ["profile", mode],
    enabled: isReady,
    queryFn: async () => {
      if (mode === "online") {
        const p = await vanillaTrpc.profile.get.query();
        return {
          glp1Drug: p?.glp1Drug ?? null,
          dosageStage: p?.dosageStage ?? null,
          weightCurrent: p?.weightCurrent ?? null,
          weightGoal: p?.weightGoal ?? null,
          dietaryPreferences: p?.dietaryPreferences ?? [],
          proteinTarget: p?.proteinTarget ?? 100,
          calorieTarget: p?.calorieTarget ?? 1800,
        };
      }
      const p = await local.getLocalProfile();
      return {
        glp1Drug: p.glp1Drug ?? null,
        dosageStage: p.dosageStage ?? null,
        weightCurrent: p.weightCurrent ?? null,
        weightGoal: p.weightGoal ?? null,
        dietaryPreferences: p.dietaryPreferences,
        proteinTarget: p.proteinTarget,
        calorieTarget: p.calorieTarget,
      };
    },
  });
}

export function useUpdateProfile() {
  const { mode } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfileUpdate): Promise<void> => {
      if (mode === "online") {
        await vanillaTrpc.profile.update.mutate(patch);
      } else {
        await local.saveLocalProfile(patch);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["dailySummary"] });
    },
  });
}

export function useAnalyzeMeal() {
  const { mode } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { imageBase64: string; mealType?: string }) => {
      if (mode === "online") {
        const res = await vanillaTrpc.meals.analyze.mutate(input);
        return res.analysis;
      }
      // 本地模式：直接在前端无法调用多模态模型，使用后端无关的 mock 分析。
      const { analyzeMealMock } = await import("./mock-analysis");
      const analysis = analyzeMealMock(input.mealType);
      await local.addLocalMeal(analysis, input.mealType);
      return analysis;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dailySummary"] });
      qc.invalidateQueries({ queryKey: ["todayMeals"] });
    },
  });
}
