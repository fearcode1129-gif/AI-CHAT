import { requireUser } from "@/server/auth/auth";
import {
  failChatStream,
  finalizeChatStream,
  startChatStream
} from "@/features/chat/server/services/chat-stream-service";
import { assertDailyQuotaAvailable } from "@/features/usage/server/services/usage-service";

export const runtime = "nodejs";

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type RequestBody = {
  chatId?: string;
  title?: string;
  messages: IncomingMessage[];
  mode?: string;
  attachmentIds?: string[];
};

function sseChunk(payload: Record<string, unknown>) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const { userId, plan } = await requireUser();
    const { chatId, title, messages, mode, attachmentIds }: RequestBody = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Missing messages" }, { status: 400 });
    }

    await assertDailyQuotaAvailable(plan, userId);

    const streamSession = await startChatStream({
      userId,
      chatId,
      title,
      messages,
      mode,
      attachmentIds
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            sseChunk({
              type: "meta",
              model: streamSession.model,
              chatId: streamSession.chatId
            })
          )
        );
        let assistantContent = "";

        try {
          for await (const chunk of streamSession.upstream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (!delta) {
              continue;
            }

            assistantContent += delta;
            controller.enqueue(encoder.encode(sseChunk({ type: "delta", delta })));
          }

          await finalizeChatStream({
            userId,
            plan,
            chatId: streamSession.chatId,
            assistantMessageId: streamSession.assistantMessageId,
            content: assistantContent,
            model: streamSession.model,
            promptMessages: messages
          });

          controller.enqueue(
            encoder.encode(
              sseChunk({
                type: "done",
                model: streamSession.model,
                chatId: streamSession.chatId
              })
            )
          );
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown upstream error";
          await failChatStream({
            assistantMessageId: streamSession.assistantMessageId,
            content: assistantContent || `生成失败：${message}`,
            model: streamSession.model
          });
          controller.enqueue(encoder.encode(sseChunk({ type: "error", error: message })));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const code =
      error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const status =
      message === "UNAUTHORIZED" ? 401 : code === "DAILY_QUOTA_EXCEEDED" ? 429 : 500;
    return Response.json({ error: message, code }, { status });
  }
}
