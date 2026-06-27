import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  real,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---- users：用户基础信息 ----
// 第一阶段使用匿名 deviceId 认证（无邮箱密码）。真实账户体系留到第二阶段。
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    deviceId: varchar("device_id", { length: 128 }).notNull(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
  },
  (t) => ({
    deviceIdIdx: uniqueIndex("users_device_id_idx").on(t.deviceId),
  }),
);

// ---- user_profiles：GLP-1 用药信息与营养目标 ----
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // GLP-1 药物名称（Ozempic / Wegovy / Mounjaro / Zepbound ...）
  glp1Drug: varchar("glp1_drug", { length: 64 }),
  // 用药阶段：Starting / Titrating / Maintenance
  dosageStage: varchar("dosage_stage", { length: 64 }),
  weightCurrent: real("weight_current"), // 当前体重（磅）
  weightGoal: real("weight_goal"), // 目标体重（磅）
  dietaryPreferences: jsonb("dietary_preferences")
    .$type<string[]>()
    .default([]),
  // 蛋白质优先：默认每日 100g（GLP-1 用户保肌肉的关键指标）
  proteinTarget: real("protein_target").default(100).notNull(),
  calorieTarget: real("calorie_target").default(1800).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---- meals：餐食记录（拍照 + AI 分析结果）----
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // 第一阶段图片以 data URL / 本地引用存储；云端 S3 留到第二阶段
  imageUrl: text("image_url"),
  mealType: varchar("meal_type", { length: 32 }), // breakfast/lunch/dinner/snack
  analysisJson: jsonb("analysis_json").$type<MealAnalysis>(),
  calories: real("calories"),
  proteinG: real("protein_g"),
  fiberG: real("fiber_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  foodItems: jsonb("food_items").$type<string[]>().default([]),
  // 份量倍数：用户可一键修正（0.5 / 1 / 1.5 份），重算宏量
  portionMultiplier: real("portion_multiplier").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// ---- weights：体重记录（趋势用）----
export const weights = pgTable("weights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  weightLb: real("weight_lb").notNull(),
  note: text("note"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// ---- chat_messages：Mira AI 陪伴聊天记录 ----
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 16 }).notNull(), // user | assistant
  content: text("content").notNull(),
  // 合规标记：该回复是否触发了医疗护栏（被改写/附加免责）
  flagged: varchar("flagged", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI 餐食分析结果结构（也用于前端类型）
export type MealAnalysis = {
  foodItems: string[];
  calories: number;
  protein_g: number;
  fiber_g: number;
  carbs_g: number;
  fat_g: number;
  // AI 对份量的假设与置信度（蛋白质优先 + 让用户可信任、可修正）
  portionAssumption: string;
  confidence: "low" | "medium" | "high";
  micronutrients?: Record<string, string>;
  notes: string;
};

export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type Weight = typeof weights.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
