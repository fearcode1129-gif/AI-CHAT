import path from "node:path";

const DEFAULT_DASHSCOPE_COMPATIBLE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_DASHSCOPE_HTTP_API_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";

type AppEnv = NodeJS.ProcessEnv;

type ServerConfig = {
  databaseUrl?: string;
  ai: {
    apiKey: string;
    compatibleBaseUrl: string;
    httpApiBaseUrl: string;
    chatModels: {
      default: string;
      fast: string;
      code: string;
      write: string;
      knowledge: string;
      imageAssistant: string;
    };
    knowledgeEmbeddingModel: string;
    imageGenerationModel: string;
  };
  files: {
    provider: "local" | "vercel-blob";
    localUploadDir: string;
    localUploadUrlBase: string;
    blobReadWriteToken?: string;
    maxUploadFileSizeMb: number;
  };
  knowledge: {
    topK: number;
    scoreThreshold: number;
    maxEmbeddingInputChars: number;
  };
  imageGeneration: {
    size: string;
    maxImages: number;
    watermark: boolean;
    pollAttempts: number;
    pollIntervalMs: number;
    enableInterleave: boolean;
  };
  quota: {
    timezone: string;
    warningThreshold: number;
    dailyTokenLimits: {
      free: number;
      pro: number;
      enterprise: number;
    };
  };
};

let cachedConfig: ServerConfig | null = null;

function readRequired(env: AppEnv, key: string) {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing ${key}`);
  }

  return value;
}

function readString(env: AppEnv, key: string, fallback: string) {
  const value = env[key]?.trim();
  return value || fallback;
}

function readNumber(env: AppEnv, key: string, fallback: number) {
  const value = env[key]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${key}: expected a number`);
  }

  return parsed;
}

function readPositiveInt(env: AppEnv, key: string, fallback: number) {
  const parsed = readNumber(env, key, fallback);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${key}: expected a positive integer`);
  }

  return parsed;
}

function readBoolean(env: AppEnv, key: string, fallback: boolean) {
  const value = env[key]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Invalid ${key}: expected true or false`);
}

function readStorageProvider(env: AppEnv) {
  const fallback = env.BLOB_READ_WRITE_TOKEN?.trim() ? "vercel-blob" : "local";
  const value = readString(env, "UPLOAD_STORAGE_PROVIDER", fallback);

  if (value !== "local" && value !== "vercel-blob") {
    throw new Error("Invalid UPLOAD_STORAGE_PROVIDER: expected local or vercel-blob");
  }

  return value;
}

function inferHttpApiBaseUrl(compatibleBaseUrl: string) {
  if (compatibleBaseUrl.includes("dashscope-intl.aliyuncs.com")) {
    return "https://dashscope-intl.aliyuncs.com/api/v1";
  }

  if (compatibleBaseUrl.includes("dashscope-us.aliyuncs.com")) {
    return "https://dashscope-us.aliyuncs.com/api/v1";
  }

  return DEFAULT_DASHSCOPE_HTTP_API_BASE_URL;
}

export function createServerConfig(env: AppEnv = process.env): ServerConfig {
  const compatibleBaseUrl = readString(
    env,
    "DASHSCOPE_BASE_URL",
    DEFAULT_DASHSCOPE_COMPATIBLE_BASE_URL
  );
  const provider = readStorageProvider(env);
  const localUploadDirName = readString(env, "UPLOAD_LOCAL_DIR", "uploads").replace(/^\/+|\/+$/g, "");
  const localUploadUrlBase = `/${localUploadDirName}`;

  return {
    databaseUrl: env.DATABASE_URL?.trim() || undefined,
    ai: {
      apiKey: readRequired(env, "DASHSCOPE_API_KEY"),
      compatibleBaseUrl,
      httpApiBaseUrl: readString(
        env,
        "DASHSCOPE_HTTP_API_BASE_URL",
        inferHttpApiBaseUrl(compatibleBaseUrl)
      ),
      chatModels: {
        default: readString(env, "DASHSCOPE_MODEL_DEFAULT", "qwen-plus"),
        fast: readString(env, "DASHSCOPE_MODEL_FAST", "qwen-turbo"),
        code: readString(env, "DASHSCOPE_MODEL_CODE", "qwen-coder-plus"),
        write: readString(env, "DASHSCOPE_MODEL_WRITE", "qwen-plus"),
        knowledge: readString(env, "DASHSCOPE_MODEL_KNOWLEDGE", "qwen-plus"),
        imageAssistant: readString(env, "DASHSCOPE_MODEL_IMAGE", "qwen3-vl-plus")
      },
      knowledgeEmbeddingModel: readString(
        env,
        "DASHSCOPE_KNOWLEDGE_EMBEDDING_MODEL",
        "text-embedding-v4"
      ),
      imageGenerationModel: readString(env, "DASHSCOPE_IMAGE_GENERATION_MODEL", "wan2.6-image")
    },
    files: {
      provider,
      localUploadDir: path.join(process.cwd(), "public", localUploadDirName),
      localUploadUrlBase,
      blobReadWriteToken: env.BLOB_READ_WRITE_TOKEN?.trim() || undefined,
      maxUploadFileSizeMb: readPositiveInt(env, "UPLOAD_MAX_FILE_SIZE_MB", 20)
    },
    knowledge: {
      topK: readPositiveInt(env, "KNOWLEDGE_TOP_K", 3),
      scoreThreshold: readNumber(env, "KNOWLEDGE_SCORE_THRESHOLD", 0.15),
      maxEmbeddingInputChars: readPositiveInt(env, "KNOWLEDGE_MAX_EMBEDDING_INPUT_CHARS", 8000)
    },
    imageGeneration: {
      size: readString(env, "IMAGE_GENERATION_SIZE", "1024*1024"),
      maxImages: readPositiveInt(env, "IMAGE_GENERATION_MAX_IMAGES", 1),
      watermark: readBoolean(env, "IMAGE_GENERATION_WATERMARK", false),
      pollAttempts: readPositiveInt(env, "IMAGE_GENERATION_POLL_ATTEMPTS", 40),
      pollIntervalMs: readPositiveInt(env, "IMAGE_GENERATION_POLL_INTERVAL_MS", 1500),
      enableInterleave: readBoolean(env, "IMAGE_GENERATION_ENABLE_INTERLEAVE", true)
    },
    quota: {
      timezone: readString(env, "APP_TIMEZONE", "Asia/Shanghai"),
      warningThreshold: readNumber(env, "QUOTA_WARNING_THRESHOLD", 0.8),
      dailyTokenLimits: {
        free: readPositiveInt(env, "QUOTA_DAILY_FREE_TOKENS", 20000),
        pro: readPositiveInt(env, "QUOTA_DAILY_PRO_TOKENS", 500000),
        enterprise: readPositiveInt(env, "QUOTA_DAILY_ENTERPRISE_TOKENS", 2000000)
      }
    }
  };
}

export function getServerConfig() {
  if (!cachedConfig) {
    cachedConfig = createServerConfig();
  }

  return cachedConfig;
}

export function resetServerConfigForTests() {
  cachedConfig = null;
}
