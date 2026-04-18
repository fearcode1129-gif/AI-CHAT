import { getServerConfig } from "@/server/config/config";

export function getDashScopeConfig() {
  const config = getServerConfig();

  return {
    apiKey: config.ai.apiKey,
    baseURL: config.ai.compatibleBaseUrl
  };
}

export function resolveModelByMode(mode?: string) {
  const { chatModels } = getServerConfig().ai;

  switch (mode) {
    case "fast":
      return chatModels.fast;
    case "code":
      return chatModels.code;
    case "write":
      return chatModels.write;
    case "knowledge":
      return chatModels.knowledge;
    case "image":
      return chatModels.imageAssistant;
    default:
      return chatModels.default;
  }
}
