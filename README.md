# Mira — GLP-1 版 Cal AI

一款面向 GLP-1 药物使用者（Ozempic / Wegovy / Mounjaro / Zepbound）的 AI 营养陪伴 App。
拍照记录食物 → AI 分析营养 → **蛋白质优先**的仪表盘，温和、非评判地陪伴用药期。

> Mira is not a medical service. 不诊断、不推荐药物、不提供医疗建议。

## 当前阶段：核心闭环（第一阶段）

已实现端到端主流程：

```
Onboarding（3 步）→ 拍照 / 选图 → AI 分析（蛋白质优先 + 份量可修正）→ 营养仪表盘
```

- **蛋白质优先**：首页主指标是蛋白质进度环（GLP-1 用户保肌肉的关键），卡路里弱化为次要信息。
- **份量可修正**：AI 给出份量假设 + 置信度，用户可一键按 0.5/1/1.5/2 份重算（份量估计是最难的一环）。
- **非评判语气**：分析结果附一句温和鼓励的话。
- **优雅降级**：未配置数据库 → 本地 AsyncStorage 模式；未配置 LLM key → 确定性 mock 数据，闭环仍可演示。

第二阶段规划：AI 陪伴聊天、餐食历史页、营养趋势图、体重记录、RevenueCat 订阅、推送通知、真实账户体系、S3 图片云存储。

## 技术栈

- **前端**：Expo SDK 54 · React Native 0.81 · Expo Router 6 · NativeWind 4 · TanStack Query
- **后端**：Express · tRPC v11（端到端类型安全）· Drizzle ORM
- **数据库**：PostgreSQL
- **AI**：可插拔 `invokeLLM`（Anthropic Claude / OpenAI gpt-4o，按 key 自动选择，均无则 mock）

## 本地开发

```bash
pnpm install            # 安装依赖（请用 pnpm）
cp .env.example .env    # 填写 DATABASE_URL / JWT_SECRET，可选 AI key
pnpm db:push            # 在 PostgreSQL 上建表
pnpm dev                # 同时启动后端 (:3000) 和前端 Metro (:8081)
```

- Web 预览：浏览器打开 `http://localhost:8081`
- 真机预览：装 Expo Go，扫终端二维码
- 仅后端 / 仅前端：`pnpm dev:server` / `pnpm dev:metro`

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 同时启动后端 + 前端 |
| `pnpm db:generate` | 由 schema 生成迁移 SQL |
| `pnpm db:push` | 直接把 schema 推到数据库 |
| `pnpm test` | Vitest 单元测试 |
| `pnpm check` | TypeScript 类型检查 |

## 环境变量

见 `.env.example`。`DATABASE_URL`、`JWT_SECRET` 必填；`ANTHROPIC_API_KEY` 或
`OPENAI_API_KEY` 二选一可选（都不配则用 mock 数据）。

## 目录结构

```
app/                # Expo Router 页面（onboarding + tabs）
components/          # UI 组件（蛋白质环、宏量卡、免责声明栏…）
lib/                # 前端：tRPC 客户端、auth、统一数据层（online/local）
server/             # Express + tRPC + Drizzle CRUD + 可插拔 LLM
drizzle/            # Schema 与迁移 SQL
constants/          # 主题 token、药物/阶段/饮食偏好选项
tests/              # Vitest 单元测试
```
