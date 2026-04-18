import { toChatSummary } from "@/features/chat/server/mappers/chat-mappers";
import { chatRepository } from "@/features/chat/server/repositories/chat-repository";
import { requireUser } from "@/server/auth/auth";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Params) {
  try {
    const { userId } = await requireUser();
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      pinned?: boolean;
      model?: string;
    };

    const chat = await chatRepository.updateChat(userId, id, {
      title: body.title,
      pinned: body.pinned,
      model: body.model
    });

    return Response.json(toChatSummary(chat));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update chat";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: Params) {
  try {
    const { userId } = await requireUser();
    const { id } = await context.params;
    await chatRepository.deleteChat(userId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete chat";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
