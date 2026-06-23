import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getProvider, invokeLLM } from "./_core/llm";
import {
  getProfile,
  upsertProfile,
  insertMeal,
  getMealsByDay,
  getDailySummary,
} from "./db";
import type { MealAnalysis } from "../drizzle/schema";

// Mira 营养分析 System Prompt —— 蛋白质优先、非评判、给出份量假设与置信度。
const MEAL_ANALYSIS_PROMPT = `你是 Mira，一个懂营养的好朋友，专门服务 GLP-1 药物使用者（如 Ozempic、Wegovy、Mounjaro、Zepbound）。
你的任务是分析用户上传的餐食照片，估算营养成分。

重要原则：
1. 蛋白质优先。GLP-1 用户食欲被抑制、吃得少，最大风险是蛋白质不足导致肌肉流失。请认真估算蛋白质含量。
2. 份量估计是最难也最关键的部分。请明确说明你对份量的假设（portionAssumption），并给出置信度（confidence: low/medium/high）。
3. 语气温和、非评判。notes 字段里给一句温暖、鼓励、聚焦整体平衡的话（不要评价用药决策、不做医疗诊断）。

只返回一个 JSON 对象，不要包含任何额外文字，格式如下：
{
  "foodItems": ["识别到的食物1", "食物2"],
  "calories": 数字(千卡),
  "protein_g": 数字(克),
  "fiber_g": 数字(克),
  "carbs_g": 数字(克),
  "fat_g": 数字(克),
  "portionAssumption": "对份量的假设说明",
  "confidence": "low|medium|high",
  "micronutrients": { "vitamin_c": "high|moderate|low", "iron": "..." },
  "notes": "一句温和鼓励的话"
}`;

// 无 LLM provider 时的确定性 mock，保证核心闭环可演示。
function mockAnalysis(mealType?: string): MealAnalysis {
  return {
    foodItems: ["鸡胸肉", "西兰花", "糙米饭"],
    calories: 520,
    protein_g: 42,
    fiber_g: 8,
    carbs_g: 55,
    fat_g: 12,
    portionAssumption: "（示例数据）按 1 份标准餐估算：约 150g 鸡胸肉 + 1 碗杂蔬 + 半碗糙米饭",
    confidence: "medium",
    micronutrients: { vitamin_c: "high", iron: "moderate" },
    notes:
      "蛋白质含量很棒，非常适合 GLP-1 用药期间食用。记得多喝水，慢慢吃就好～",
  };
}

export function parseAnalysis(raw: string): MealAnalysis {
  // 容错：剥离可能的 ```json 围栏，截取首个 { ... }
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonStr = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(jsonStr);
  return {
    foodItems: Array.isArray(parsed.foodItems) ? parsed.foodItems : [],
    calories: Number(parsed.calories) || 0,
    protein_g: Number(parsed.protein_g) || 0,
    fiber_g: Number(parsed.fiber_g) || 0,
    carbs_g: Number(parsed.carbs_g) || 0,
    fat_g: Number(parsed.fat_g) || 0,
    portionAssumption: String(parsed.portionAssumption ?? ""),
    confidence: ["low", "medium", "high"].includes(parsed.confidence)
      ? parsed.confidence
      : "low",
    micronutrients: parsed.micronutrients ?? {},
    notes: String(parsed.notes ?? ""),
  };
}

export async function analyzeMealImage(
  imageBase64: string,
  mealType?: string,
): Promise<MealAnalysis> {
  if (getProvider() === "none") {
    return mockAnalysis(mealType);
  }
  const raw = await invokeLLM({
    messages: [
      { role: "system", content: MEAL_ANALYSIS_PROMPT },
      {
        role: "user",
        content: `请分析这张${mealType ? `（${mealType}）` : ""}餐食照片的营养成分。`,
      },
    ],
    imageBase64,
    responseFormatJson: true,
    maxTokens: 1024,
  });
  try {
    return parseAnalysis(raw);
  } catch {
    // 解析失败时降级为 mock，避免闭环中断
    return mockAnalysis(mealType);
  }
}

export const appRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
    llmProvider: getProvider(),
  })),

  profile: router({
    get: protectedProcedure.query(({ ctx }) => getProfile(ctx.db, ctx.userId)),
    update: protectedProcedure
      .input(
        z.object({
          glp1Drug: z.string().optional(),
          dosageStage: z.string().optional(),
          weightCurrent: z.number().optional(),
          weightGoal: z.number().optional(),
          dietaryPreferences: z.array(z.string()).optional(),
          proteinTarget: z.number().optional(),
          calorieTarget: z.number().optional(),
        }),
      )
      .mutation(({ ctx, input }) => upsertProfile(ctx.db, ctx.userId, input)),
  }),

  meals: router({
    analyze: protectedProcedure
      .input(
        z.object({
          imageBase64: z.string(),
          mealType: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const analysis = await analyzeMealImage(input.imageBase64, input.mealType);
        const meal = await insertMeal(ctx.db, ctx.userId, {
          mealType: input.mealType,
          analysis,
        });
        return { meal, analysis };
      }),

    today: protectedProcedure
      .input(z.object({ date: z.string().optional() }).optional())
      .query(({ ctx, input }) => {
        const day = input?.date ? new Date(input.date) : new Date();
        return getMealsByDay(ctx.db, ctx.userId, day);
      }),

    dailySummary: protectedProcedure
      .input(z.object({ date: z.string().optional() }).optional())
      .query(({ ctx, input }) => {
        const day = input?.date ? new Date(input.date) : new Date();
        return getDailySummary(ctx.db, ctx.userId, day);
      }),
  }),
});

export type AppRouter = typeof appRouter;
