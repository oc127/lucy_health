import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env } from "./env";

// 可插拔 LLM 接口：按环境变量选择 provider。
// 优先 Claude（多模态视觉），其次 OpenAI gpt-4o，都没配则由调用方使用 mock。
export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type InvokeLLMOptions = {
  messages: LLMMessage[];
  // 可选：随最后一条 user 消息附带的图片（data URL 或 base64，多模态分析用）
  imageBase64?: string;
  // 要求模型返回 JSON
  responseFormatJson?: boolean;
  maxTokens?: number;
};

export type LLMProvider = "anthropic" | "openai" | "none";

export function getProvider(): LLMProvider {
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY) return "openai";
  return "none";
}

function toRawBase64(input: string): { data: string; mediaType: string } {
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (match) return { mediaType: match[1], data: match[2] };
  return { mediaType: "image/jpeg", data: input };
}

async function invokeAnthropic(opts: InvokeLLMOptions): Promise<string> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const system = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const turns = opts.messages.filter((m) => m.role !== "system");
  const messages: Anthropic.MessageParam[] = turns.map((m, i) => {
    const isLastUser = i === turns.length - 1 && m.role === "user";
    if (isLastUser && opts.imageBase64) {
      const { data, mediaType } = toRawBase64(opts.imageBase64);
      return {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data,
            },
          },
          { type: "text", text: m.content },
        ],
      };
    }
    return { role: m.role as "user" | "assistant", content: m.content };
  });

  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: opts.maxTokens ?? 1024,
    system: system || undefined,
    messages,
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return text;
}

async function invokeOpenAI(opts: InvokeLLMOptions): Promise<string> {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = opts.messages.map(
    (m, i) => {
      const isLastUser =
        i === opts.messages.length - 1 && m.role === "user";
      if (isLastUser && opts.imageBase64) {
        const url = opts.imageBase64.startsWith("data:")
          ? opts.imageBase64
          : `data:image/jpeg;base64,${opts.imageBase64}`;
        return {
          role: "user",
          content: [
            { type: "text", text: m.content },
            { type: "image_url", image_url: { url } },
          ],
        };
      }
      return { role: m.role, content: m.content } as
        OpenAI.Chat.ChatCompletionMessageParam;
    },
  );

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: msgs,
    max_tokens: opts.maxTokens ?? 1024,
    response_format: opts.responseFormatJson
      ? { type: "json_object" }
      : undefined,
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function invokeLLM(opts: InvokeLLMOptions): Promise<string> {
  const provider = getProvider();
  if (provider === "anthropic") return invokeAnthropic(opts);
  if (provider === "openai") return invokeOpenAI(opts);
  throw new Error("No LLM provider configured");
}
