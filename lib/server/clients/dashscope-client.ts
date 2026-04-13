import OpenAI from "openai";

import { getDashScopeConfig } from "@/lib/server/aliyun";

type StreamInputMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function createDashScopeChatStream(input: {
  model: string;
  messages: StreamInputMessage[];
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
  });
}
