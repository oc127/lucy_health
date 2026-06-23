import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyToken } from "./auth";
import { dbClient } from "./db";

// tRPC Context：从 Authorization: Bearer <jwt> 解析 userId。
export function createContext({ req }: CreateExpressContextOptions) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const auth = token ? verifyToken(token) : null;

  return {
    db: dbClient,
    userId: auth?.userId ?? null,
    deviceId: auth?.deviceId ?? null,
  };
}

export type Context = ReturnType<typeof createContext>;
