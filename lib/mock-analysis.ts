import type { MealAnalysis } from "../drizzle/schema";

// 本地降级模式下的示例分析数据（无后端/无 LLM 时让闭环可演示）。
export function analyzeMealMock(_mealType?: string): MealAnalysis {
  return {
    foodItems: ["鸡胸肉", "西兰花", "糙米饭"],
    calories: 520,
    protein_g: 42,
    fiber_g: 8,
    carbs_g: 55,
    fat_g: 12,
    portionAssumption:
      "（本地示例数据）按 1 份标准餐估算：约 150g 鸡胸肉 + 1 碗杂蔬 + 半碗糙米饭",
    confidence: "medium",
    micronutrients: { vitamin_c: "high", iron: "moderate" },
    notes: "蛋白质含量很棒，非常适合 GLP-1 用药期间食用。慢慢吃，记得多喝水～",
  };
}
