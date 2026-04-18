import { toClientMessage } from "@/features/chat/server/mappers/chat-mappers";
import { chatRepository } from "@/features/chat/server/repositories/chat-repository";
import { requireUser } from "@/server/auth/auth";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Params) {
  try {
    const { userId } = await requireUser();
    const { id } = await context.params;
    const messages = await chatRepository.listMessages(userId, id);

    return Response.json(messages.map(toClientMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load messages";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
