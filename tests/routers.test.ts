import { describe, it, expect } from "vitest";
import { computeSummary } from "../server/db";
import { parseAnalysis, analyzeMealImage } from "../server/routers";

describe("computeSummary — 蛋白质优先汇总", () => {
  it("聚合多餐宏量并计算蛋白质缺口", () => {
    const meals = [
      { calories: 500, proteinG: 40, fiberG: 5, carbsG: 50, fatG: 10 },
      { calories: 300, proteinG: 25, fiberG: 3, carbsG: 30, fatG: 8 },
    ];
    const r = computeSummary(meals, 100, 1800);
    expect(r.summary.totalProtein).toBe(65);
    expect(r.summary.totalCalories).toBe(800);
    expect(r.summary.proteinGap).toBe(35); // 100 - 65
    expect(r.targets.protein).toBe(100);
    expect(r.mealCount).toBe(2);
  });

  it("蛋白质达标时缺口为 0（不为负）", () => {
    const r = computeSummary([{ proteinG: 120 }], 100, 1800);
    expect(r.summary.proteinGap).toBe(0);
  });

  it("按 portionMultiplier 缩放宏量", () => {
    const r = computeSummary(
      [{ proteinG: 40, calories: 500, portionMultiplier: 1.5 }],
      100,
      1800,
    );
    expect(r.summary.totalProtein).toBe(60); // 40 * 1.5
    expect(r.summary.totalCalories).toBe(750);
  });

  it("空餐食列表返回全 0", () => {
    const r = computeSummary([], 100, 1800);
    expect(r.summary.totalProtein).toBe(0);
    expect(r.summary.proteinGap).toBe(100);
    expect(r.mealCount).toBe(0);
  });
});

describe("parseAnalysis — AI 返回解析的鲁棒性", () => {
  it("解析纯 JSON", () => {
    const a = parseAnalysis(
      JSON.stringify({
        foodItems: ["鸡蛋"],
        calories: 80,
        protein_g: 6,
        fiber_g: 0,
        carbs_g: 1,
        fat_g: 5,
        portionAssumption: "1 个鸡蛋",
        confidence: "high",
        notes: "好选择",
      }),
    );
    expect(a.protein_g).toBe(6);
    expect(a.confidence).toBe("high");
    expect(a.foodItems).toEqual(["鸡蛋"]);
  });

  it("剥离 ```json 围栏并解析", () => {
    const raw = '```json\n{"protein_g": 20, "calories": 200}\n```';
    const a = parseAnalysis(raw);
    expect(a.protein_g).toBe(20);
    expect(a.calories).toBe(200);
  });

  it("截取前后含杂文本中的 JSON 对象", () => {
    const raw = '好的，这是分析：{"protein_g": 15} 希望有帮助';
    const a = parseAnalysis(raw);
    expect(a.protein_g).toBe(15);
  });

  it("非法 confidence 归一为 low，缺失字段补默认", () => {
    const a = parseAnalysis('{"confidence":"超高","protein_g":10}');
    expect(a.confidence).toBe("low");
    expect(a.fiber_g).toBe(0);
    expect(a.foodItems).toEqual([]);
  });
});

describe("analyzeMealImage — 无 LLM provider 时降级 mock", () => {
  it("未配置 key 时返回确定性 mock（保证闭环可演示）", async () => {
    // 测试环境无 ANTHROPIC_API_KEY / OPENAI_API_KEY → provider 为 none
    const a = await analyzeMealImage("data:image/jpeg;base64,xxx", "lunch");
    expect(a.protein_g).toBeGreaterThan(0);
    expect(a.foodItems.length).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(a.confidence);
  });
});
