import { describe, it, expect } from "vitest";
import { computeSummary, buildTrend } from "../server/db";
import {
  parseAnalysis,
  analyzeMealImage,
  generateChatReply,
} from "../server/routers";
import { checkCompliance } from "../server/_core/compliance";

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

describe("buildTrend — 营养趋势按天聚合", () => {
  it("生成连续 7 天且把当天餐食归到当天", () => {
    const now = new Date();
    const meals = [
      { createdAt: now, proteinG: 30, calories: 400 },
      { createdAt: now, proteinG: 20, calories: 300 },
    ];
    const t = buildTrend(meals, 7);
    expect(t).toHaveLength(7);
    // 最后一个点是今天，蛋白质应为 50
    expect(t[t.length - 1].protein).toBe(50);
    expect(t[t.length - 1].calories).toBe(700);
    // 之前的天没有数据 → 0
    expect(t[0].protein).toBe(0);
  });

  it("应用 portionMultiplier", () => {
    const t = buildTrend(
      [{ createdAt: new Date(), proteinG: 40, calories: 500, portionMultiplier: 0.5 }],
      3,
    );
    expect(t[t.length - 1].protein).toBe(20);
  });
});

describe("checkCompliance — 医疗护栏识别", () => {
  it("剂量相关问题标记为 medical", () => {
    expect(checkCompliance("我应该加量到 1mg 吗？").level).toBe("medical");
    expect(checkCompliance("这个副作用正常吗").level).toBe("medical");
  });

  it("危机/严重症状标记为 crisis", () => {
    expect(checkCompliance("我持续呕吐而且剧烈腹痛").level).toBe("crisis");
    expect(checkCompliance("我不想活了").level).toBe("crisis");
  });

  it("普通营养问题不触发护栏", () => {
    expect(checkCompliance("早餐吃什么蛋白质高？").level).toBe("none");
  });
});

describe("generateChatReply — 合规优先 + 无 LLM 降级", () => {
  it("危机消息直接返回安全引导且不调用模型", async () => {
    const r = await generateChatReply("我想结束这一切", []);
    expect(r.flagged).toBe("crisis");
    expect(r.content).toContain("急救");
  });

  it("医疗问题在无 key 时附加就医提示并标记 medical", async () => {
    const r = await generateChatReply("我该减量吗", []);
    expect(r.flagged).toBe("medical");
    expect(r.content).toContain("医生");
  });

  it("普通问题在无 key 时给出友好占位回复", async () => {
    const r = await generateChatReply("今天该多吃点什么", []);
    expect(r.flagged).toBeNull();
    expect(r.content.length).toBeGreaterThan(0);
  });
});
