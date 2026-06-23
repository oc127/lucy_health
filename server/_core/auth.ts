import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { env } from "./env";
import { dbClient, schema } from "./db";

export type AuthTokenPayload = { userId: number; deviceId: string };

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "365d" });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    if (typeof decoded.userId === "number" && decoded.deviceId) return decoded;
    return null;
  } catch {
    return null;
  }
}

// 匿名设备认证：根据 deviceId upsert 用户并签发 JWT。
// 第一阶段无需邮箱密码；真实账户体系（Apple/Google/邮箱）留到第二阶段。
export async function authenticateDevice(
  deviceId: string,
): Promise<{ token: string; userId: number }> {
  if (!dbClient) {
    throw new Error("Database not configured");
  }
  const existing = await dbClient
    .select()
    .from(schema.users)
    .where(eq(schema.users.deviceId, deviceId))
    .limit(1);

  let userId: number;
  if (existing.length > 0) {
    userId = existing[0].id;
    await dbClient
      .update(schema.users)
      .set({ lastSignedIn: new Date() })
      .where(eq(schema.users.id, userId));
  } else {
    const inserted = await dbClient
      .insert(schema.users)
      .values({ deviceId })
      .returning({ id: schema.users.id });
    userId = inserted[0].id;
    // 新用户：建立默认营养档案（蛋白质优先）
    await dbClient.insert(schema.userProfiles).values({ userId });
  }

  return { token: signToken({ userId, deviceId }), userId };
}
