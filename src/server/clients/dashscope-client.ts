import OpenAI from "openai";

import { getDashScopeConfig } from "@/server/config/aliyun";

type StreamInputMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function createDashScopeChatStream(input: {
  model: string;
  messages: StreamInputMessage[];
  signal?: AbortSignal;
}) {
  const { apiKey, baseURL } = getDashScopeConfig();
  const client = new OpenAI({
    apiKey,
    baseURL
  });

  return client.chat.completions.create({
    model: input.model,
    stream: true,
    messages: input.messages
  }, {
    signal: input.signal
  });
}
