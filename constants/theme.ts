// 运行时颜色常量（与 theme.config.js / tailwind 共享同一套 token）
const { colors } = require("../theme.config.js");

export const Colors = colors as {
  primary: Record<string, string>;
  protein: string;
  macro: { calories: string; carbs: string; fat: string; fiber: string };
};

// GLP-1 药物选项
export const GLP1_DRUGS = [
  "Ozempic",
  "Wegovy",
  "Mounjaro",
  "Zepbound",
  "Rybelsus",
  "其他 / 暂不使用",
] as const;

// 用药阶段
export const DOSAGE_STAGES = [
  { key: "Starting", label: "刚开始用药 (Starting)" },
  { key: "Titrating", label: "正在加量 (Titrating)" },
  { key: "Maintenance", label: "维持剂量 (Maintenance)" },
] as const;

// 饮食偏好
export const DIETARY_PREFERENCES = [
  "Vegetarian 素食",
  "Vegan 纯素",
  "Gluten-free 无麸质",
  "Dairy-free 无乳制品",
  "Low-carb 低碳水",
  "Halal 清真",
  "Kosher 洁食",
] as const;
