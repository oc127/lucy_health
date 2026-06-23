import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// 需要登录 + 数据库可用的 procedure。
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.db) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Database not configured",
    });
  }
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: { ...ctx, db: ctx.db, userId: ctx.userId },
  });
});
