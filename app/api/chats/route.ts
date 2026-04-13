import { requireUser } from "@/lib/server/auth";
import { toChatSummary } from "@/lib/server/chat-mappers";
import { chatRepository } from "@/lib/server/repositories/chat-repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const chats = await chatRepository.listChats(userId);

    return Response.json(chats.map(toChatSummary));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chats";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      model?: string;
    };

    const chat = await chatRepository.createChat({
      title: body.title?.trim() || "新的对话",
      model: body.model,
      userId
    });

    return Response.json(toChatSummary(chat), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create chat";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
