import { describe, expect, it } from "vitest";

describe("server config", () => {
  it("builds a normalized config object from env", async () => {
    const { createServerConfig } = await import("@/lib/server/config");
    const config = createServerConfig({
      DASHSCOPE_API_KEY: "test-key",
      DASHSCOPE_BASE_URL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      UPLOAD_LOCAL_DIR: "custom-uploads",
      UPLOAD_MAX_FILE_SIZE_MB: "32",
      KNOWLEDGE_TOP_K: "5",
      KNOWLEDGE_SCORE_THRESHOLD: "0.2",
      IMAGE_GENERATION_POLL_INTERVAL_MS: "2000"
    });

    expect(config.ai.httpApiBaseUrl).toBe("https://dashscope-intl.aliyuncs.com/api/v1");
    expect(config.files.provider).toBe("local");
    expect(config.files.localUploadUrlBase).toBe("/custom-uploads");
    expect(config.files.maxUploadFileSizeMb).toBe(32);
    expect(config.knowledge.topK).toBe(5);
    expect(config.knowledge.scoreThreshold).toBe(0.2);
    expect(config.imageGeneration.pollIntervalMs).toBe(2000);
    expect(config.quota.timezone).toBe("Asia/Shanghai");
    expect(config.quota.dailyTokenLimits.free).toBe(20000);
  });

  it("throws for missing required env vars", async () => {
    const { createServerConfig } = await import("@/lib/server/config");

    expect(() => createServerConfig({})).toThrowError("Missing DASHSCOPE_API_KEY");
  });

  it("switches uploads to vercel blob when a blob token is present", async () => {
    const { createServerConfig } = await import("@/lib/server/config");
    const config = createServerConfig({
      DASHSCOPE_API_KEY: "test-key",
      BLOB_READ_WRITE_TOKEN: "blob-token"
    });

    expect(config.files.provider).toBe("vercel-blob");
    expect(config.files.blobReadWriteToken).toBe("blob-token");
  });
});
