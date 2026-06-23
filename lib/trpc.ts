import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, createTRPCClient } from "@trpc/client";
import superjson from "superjson";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppRouter } from "../server/routers";
import { getApiBaseUrl } from "../constants/oauth";

export const trpc = createTRPCReact<AppRouter>();

const TOKEN_KEY = "mira.auth.token";

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function setStoredToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function clearStoredToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

const links = () => [
  httpBatchLink({
    url: `${getApiBaseUrl()}/api/trpc`,
    transformer: superjson,
    async headers() {
      const token = await getStoredToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
  }),
];

export function createTrpcClient() {
  return trpc.createClient({ links: links() });
}

// 命令式 vanilla 客户端（供统一数据层 lib/data.ts 在 online 模式下调用）
export const vanillaTrpc = createTRPCClient<AppRouter>({ links: links() });
