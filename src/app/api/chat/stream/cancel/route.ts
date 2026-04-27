import { abortRegisteredStream } from "@/features/chat/server/services/stream-abort-registry";
import { requireUser } from "@/server/auth/auth";

export const runtime = "nodejs";

type CancelStreamRequest = {
  streamId?: string;
};

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const body = (await request.json().catch(() => ({}))) as CancelStreamRequest;
    const streamId = String(body.streamId ?? "").trim();

    if (!streamId) {
      return Response.json({ error: "Missing streamId" }, { status: 400 });
    }

    const cancelled = abortRegisteredStream(userId, streamId);
    return Response.json({ cancelled });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
