import { attachmentRepository } from "@/features/files/server/repositories/attachment-repository";
import { chatRepository } from "@/features/chat/server/repositories/chat-repository";
import { getServerConfig } from "@/server/config/config";

type DashScopeImageContent = {
  type?: string;
  image?: string;
  text?: string;
};

type DashScopeImageTaskResponse = {
  code?: string;
  message?: string;
  output?: {
    task_id?: string;
    task_status?: string;
    finished?: boolean;
    code?: string;
    message?: string;
    choices?: Array<{
      finish_reason?: string;
      message?: {
        role?: string;
        content?: DashScopeImageContent[];
      };
    }>;
  };
};

function getDashScopeHttpApiBase() {
  return getServerConfig().ai.httpApiBaseUrl;
}

function extractImageUrl(payload: DashScopeImageTaskResponse) {
  const choices = payload.output?.choices ?? [];

  for (const choice of choices) {
    for (const content of choice.message?.content ?? []) {
      if (content.type === "image" && content.image) {
        return content.image;
      }
    }
  }

  return undefined;
}

async function readErrorMessage(response: Response) {
  const text = await response.text();

  try {
    const payload = JSON.parse(text) as { code?: string; message?: string };
    return payload.message || payload.code || text;
  } catch {
    return text;
  }
}

async function createImageTask(prompt: string) {
  const { ai, imageGeneration } = getServerConfig();
  const apiBase = getDashScopeHttpApiBase();
  const response = await fetch(`${apiBase}/services/aigc/image-generation/generation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ai.apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable"
    },
    body: JSON.stringify({
      model: ai.imageGenerationModel,
      input: {
        messages: [
          {
            role: "user",
            content: [
              {
                text: prompt
              }
            ]
          }
        ]
      },
      parameters: {
        enable_interleave: imageGeneration.enableInterleave,
        max_images: imageGeneration.maxImages,
        n: 1,
        size: imageGeneration.size,
        watermark: imageGeneration.watermark
      }
    })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as DashScopeImageTaskResponse;
}

async function pollImageTask(taskId: string) {
  const { ai, imageGeneration } = getServerConfig();
  const apiBase = getDashScopeHttpApiBase();

  for (let attempt = 0; attempt < imageGeneration.pollAttempts; attempt += 1) {
    const response = await fetch(`${apiBase}/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${ai.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const payload = (await response.json()) as DashScopeImageTaskResponse;
    const status = payload.output?.task_status;

    if (status === "SUCCEEDED") {
      return extractImageUrl(payload);
    }

    if (status === "FAILED" || status === "CANCELED") {
      const failureMessage = payload.output?.message || payload.message || payload.output?.code;
      throw new Error(failureMessage || `Image generation failed with status ${status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, imageGeneration.pollIntervalMs));
  }

  throw new Error("Image generation timed out");
}

export async function generateImageChat(input: {
  userId: string;
  chatId?: string;
  title: string;
  prompt: string;
}) {
  const model = getServerConfig().ai.imageGenerationModel;
  const chat =
    input.chatId != null
      ? await chatRepository.updateChat(input.userId, input.chatId, {
          updatedAt: new Date(),
          model,
          title: input.title
        })
      : await chatRepository.createChat({
          title: input.title,
          model,
          userId: input.userId
        });

  const userMessage = await chatRepository.createUserMessage(chat.id, input.prompt);
  const assistantMessage = await chatRepository.createAssistantPlaceholder(chat.id, model);

  try {
    const task = await createImageTask(input.prompt);
    const taskId = task.output?.task_id;

    if (!taskId) {
      throw new Error("Image generation task id is missing");
    }

    const imageUrl = await pollImageTask(taskId);

    if (!imageUrl) {
      throw new Error("Image generation result is missing");
    }

    await attachmentRepository.create({
      userId: input.userId,
      name: "generated-image.png",
      kind: "image",
      sizeLabel: "Remote generated",
      mimeType: "image/png",
      url: imageUrl,
      chatId: chat.id,
      messageId: assistantMessage.id
    });

    const content = `![generated image](${imageUrl})\n\nImage generated successfully based on your prompt.`;
    await chatRepository.finalizeAssistantMessage(assistantMessage.id, content, model);
    await chatRepository.updateChat(input.userId, chat.id, {
      updatedAt: new Date(),
      model
    });

    return {
      chatId: chat.id,
      model,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      content,
      imageUrl
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await chatRepository.failAssistantMessage(
      assistantMessage.id,
      `Image generation failed: ${message}`,
      model
    );
    throw error;
  }
}
