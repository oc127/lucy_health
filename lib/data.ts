import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-context";
import { vanillaTrpc } from "./trpc";
import * as local from "./local-store";
import type { ProfileUpdate } from "../server/db";
import {
  checkCompliance,
  CRISIS_RESPONSE,
  MEDICAL_DISCLAIMER_SUFFIX,
} from "../server/_core/compliance";

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
      qc.invalidateQueries({ queryKey: ["mealHistory"] });
      qc.invalidateQueries({ queryKey: ["trend"] });
    },
  });
}

// ---- 餐食历史 ----
export type HistoryMeal = {
  id: number;
  mealType?: string;
  foodItems: string[];
  calories: number;
  proteinG: number;
  createdAt: Date;
};

export function useMealHistory(days = 14) {
  const { mode, isReady } = useAuth();
  return useQuery<HistoryMeal[]>({
    queryKey: ["mealHistory", mode, days],
    enabled: isReady,
    queryFn: async () => {
      if (mode === "online") {
        const rows = await vanillaTrpc.meals.history.query({ days });
        return rows.map((m) => ({
          id: m.id,
          mealType: m.mealType ?? undefined,
          foodItems: m.foodItems ?? [],
          calories: m.calories ?? 0,
          proteinG: m.proteinG ?? 0,
          createdAt: m.createdAt,
        }));
      }
      const rows = await local.getLocalMealHistory(days);
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

// ---- 营养趋势 ----
export type TrendPoint = { date: string; protein: number; calories: number };

export function useTrend(days = 7) {
  const { mode, isReady } = useAuth();
  return useQuery<TrendPoint[]>({
    queryKey: ["trend", mode, days],
    enabled: isReady,
    queryFn: () =>
      mode === "online"
        ? vanillaTrpc.meals.trend.query({ days })
        : local.getLocalTrend(days),
  });
}

// ---- 体重 ----
export type WeightPoint = { id: number; weightLb: number; note?: string; recordedAt: Date };

export function useWeights() {
  const { mode, isReady } = useAuth();
  return useQuery<WeightPoint[]>({
    queryKey: ["weights", mode],
    enabled: isReady,
    queryFn: async () => {
      if (mode === "online") {
        const rows = await vanillaTrpc.weights.list.query();
        return rows.map((w) => ({
          id: w.id,
          weightLb: w.weightLb,
          note: w.note ?? undefined,
          recordedAt: w.recordedAt,
        }));
      }
      const rows = await local.listLocalWeights();
      return rows.map((w) => ({
        id: w.id,
        weightLb: w.weightLb,
        note: w.note,
        recordedAt: new Date(w.recordedAt),
      }));
    },
  });
}

export function useAddWeight() {
  const { mode } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { weightLb: number; note?: string }): Promise<void> => {
      if (mode === "online") {
        await vanillaTrpc.weights.add.mutate(input);
      } else {
        await local.addLocalWeight(input.weightLb, input.note);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weights"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// ---- Mira 聊天 ----
export type ChatMsg = {
  id: number;
  role: "user" | "assistant";
  content: string;
  flagged?: string;
};

export function useChatHistory() {
  const { mode, isReady } = useAuth();
  return useQuery<ChatMsg[]>({
    queryKey: ["chat", mode],
    enabled: isReady,
    queryFn: async () => {
      if (mode === "online") {
        const rows = await vanillaTrpc.chat.history.query();
        return rows.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          flagged: m.flagged ?? undefined,
        }));
      }
      const rows = await local.getLocalChat();
      return rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        flagged: m.flagged,
      }));
    },
  });
}

// 本地模式的聊天回复（无 LLM）：复用与后端一致的合规护栏 + 友好占位。
function localChatReply(message: string): { content: string; flagged?: string } {
  const check = checkCompliance(message);
  if (check.level === "crisis") {
    return { content: CRISIS_RESPONSE, flagged: "crisis" };
  }
  const base =
    "我在呢～现在是本地示例模式，配置 AI key 后我就能和你好好聊营养啦。先记得多补充蛋白质和水分哦 💧";
  if (check.level === "medical") {
    return { content: base + MEDICAL_DISCLAIMER_SUFFIX, flagged: "medical" };
  }
  return { content: base };
}

export function useSendChat() {
  const { mode } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string): Promise<void> => {
      if (mode === "online") {
        await vanillaTrpc.chat.send.mutate({ message });
        return;
      }
      await local.appendLocalChat({ role: "user", content: message });
      const reply = localChatReply(message);
      await local.appendLocalChat({
        role: "assistant",
        content: reply.content,
        flagged: reply.flagged,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat"] });
    },
  });
}
