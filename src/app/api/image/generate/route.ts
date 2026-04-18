import { CHAT_TITLE_MAX_LENGTH, DEFAULT_NEW_CHAT_TITLE } from "@/features/chat/constants/chat";
import { requireUser } from "@/server/auth/auth";
import { generateImageChat } from "@/server/services/image-generation";
import type { GenerateImageRequest } from "@/shared/types/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = (await request.json()) as GenerateImageRequest;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return Response.json({ error: "Missing prompt" }, { status: 400 });
    }

    const result = await generateImageChat({
      userId,
      chatId: body.chatId,
      prompt,
      title: body.title?.trim() || prompt.slice(0, CHAT_TITLE_MAX_LENGTH) || DEFAULT_NEW_CHAT_TITLE
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
