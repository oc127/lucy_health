import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { authenticateDevice } from "./auth";
import { env, hasDatabase } from "./env";

const app = express();
app.use(express.json({ limit: "15mb" })); // 餐食图片以 base64 传输

// 简单 CORS（开发用）
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// 匿名设备登录：前端首次启动用 deviceId 换取 JWT
app.post("/api/auth/device", async (req, res) => {
  const deviceId = String(req.body?.deviceId ?? "").trim();
  if (!deviceId) {
    res.status(400).json({ error: "deviceId required" });
    return;
  }
  if (!hasDatabase) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }
  try {
    const result = await authenticateDevice(deviceId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext }),
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(env.PORT, () => {
  console.log(`[server] tRPC API running at http://localhost:${env.PORT}`);
});
