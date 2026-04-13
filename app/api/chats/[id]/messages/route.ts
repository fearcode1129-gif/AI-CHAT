import { requireUser } from "@/lib/server/auth";
import { toClientMessage } from "@/lib/server/chat-mappers";
import { chatRepository } from "@/lib/server/repositories/chat-repository";

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
