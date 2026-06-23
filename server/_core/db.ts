import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../drizzle/schema";
import { env, hasDatabase } from "./env";

// 单例 PostgreSQL 连接池 + Drizzle 客户端。
// 未配置 DATABASE_URL 时 dbClient 为 null，调用方需做本地降级处理。
let pool: Pool | null = null;

if (hasDatabase) {
  pool = new Pool({ connectionString: env.DATABASE_URL });
}

export const dbClient = pool ? drizzle(pool, { schema }) : null;
export { schema };

export type DbClient = NonNullable<typeof dbClient>;
