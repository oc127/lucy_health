import "dotenv/config";

// 集中读取环境变量，提供合理默认值与降级提示。
export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  JWT_SECRET:
    process.env.JWT_SECRET ?? "dev-insecure-secret-change-me-32-characters",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  PORT: Number(process.env.PORT ?? 3000),
};

export const hasDatabase = env.DATABASE_URL.length > 0;
export const hasLLM =
  env.ANTHROPIC_API_KEY.length > 0 || env.OPENAI_API_KEY.length > 0;

if (!hasDatabase) {
  console.warn(
    "[env] DATABASE_URL not set — 数据库功能禁用，App 仅本地模式可用（降级提示，属正常）。",
  );
}
if (!hasLLM) {
  console.warn(
    "[env] 未配置 ANTHROPIC_API_KEY / OPENAI_API_KEY — AI 分析使用 mock 数据。",
  );
}
