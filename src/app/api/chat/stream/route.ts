import { requireUser } from "@/server/auth/auth";
import {
  abortChatStream,
  failChatStream,
  finalizeChatStream,
  startChatStream,
  stopChatStreamForQuota
} from "@/features/chat/server/services/chat-stream-service";
import { acquireUserStreamSlot } from "@/features/chat/server/services/stream-concurrency";
import { registerStreamAbortController } from "@/features/chat/server/services/stream-abort-registry";
import { consumeAdditionalCompletionTokens } from "@/features/usage/server/services/usage-service";
import { estimateTokensFromText } from "@/features/usage/server/services/quota";

export const runtime = "nodejs";

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type RequestBody = {
  streamId?: string;
  chatId?: string;
  title?: string;
  messages: IncomingMessage[];
  mode?: string;
  attachmentIds?: string[];
};

function sseChunk(payload: Record<string, unknown>) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

const STREAM_COMPLETION_TOKEN_CHARGE_BATCH = 128;
const QUOTA_EXCEEDED_STREAM_MESSAGE = "Daily quota exhausted. Generation has been paused.";

export async function POST(request: Request) {
  let releaseStreamSlot: (() => void) | null = null;
  let unregisterAbortController: (() => void) | null = null;

  try {
    const { userId, plan } = await requireUser();
    const { streamId, chatId, title, messages, mode, attachmentIds }: RequestBody =
      await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Missing messages" }, { status: 400 });
    }

    if (!streamId) {
      return Response.json({ error: "Missing streamId" }, { status: 400 });
    }

    releaseStreamSlot = acquireUserStreamSlot(userId);
    const upstreamAbortController = new AbortController();
    unregisterAbortController = registerStreamAbortController(
      userId,
      streamId,
      upstreamAbortController
    );
    request.signal.addEventListener(
      "abort",
      () => {
        upstreamAbortController.abort();
      },
      { once: true }
    );

    const streamSession = await startChatStream({
      userId,
      plan,
      chatId,
      title,
      messages,
      mode,
      attachmentIds,
      signal: upstreamAbortController.signal
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let streamClosed = false;
        let abortHandled = false;
        let assistantContent = "";
        let chargedCompletionTokens = streamSession.usageReservation.reservedCompletionTokens;

        const closeStream = () => {
          if (streamClosed) {
            return;
          }

          streamClosed = true;
          try {
            controller.close();
          } catch {
            // The client may have already cancelled the readable stream.
          }
        };

        const enqueue = (payload: Record<string, unknown>) => {
          if (streamClosed) {
            return;
          }

          try {
            controller.enqueue(encoder.encode(sseChunk(payload)));
          } catch {
            streamClosed = true;
          }
        };

        const handleAbort = async () => {
          if (abortHandled) {
            return;
          }

          abortHandled = true;
          try {
            await abortChatStream({
              userId,
              plan,
              chatId: streamSession.chatId,
              assistantMessageId: streamSession.assistantMessageId,
              content: assistantContent,
              model: streamSession.model,
              usageReservation: streamSession.usageReservation
            });
          } finally {
            closeStream();
          }
        };

        if (upstreamAbortController.signal.aborted) {
          await handleAbort();
          releaseStreamSlot?.();
          releaseStreamSlot = null;
          return;
        }

        const abortPromise = new Promise<never>((_, reject) => {
          upstreamAbortController.signal.addEventListener(
            "abort",
            () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            },
            { once: true }
          );
        });

        controller.enqueue(
          encoder.encode(
            sseChunk({
              type: "meta",
              model: streamSession.model,
              chatId: streamSession.chatId
            })
          )
        );

        const chargeCompletionIfNeeded = async (nextContent: string) => {
          const requiredCompletionTokens = estimateTokensFromText(nextContent);
          if (requiredCompletionTokens <= chargedCompletionTokens) {
            return true;
          }

          const extraTokens = Math.max(
            requiredCompletionTokens - chargedCompletionTokens,
            STREAM_COMPLETION_TOKEN_CHARGE_BATCH
          );

          try {
            await consumeAdditionalCompletionTokens({
              plan,
              userId,
              dateKey: streamSession.usageReservation.dateKey,
              completionTokens: extraTokens
            });
            chargedCompletionTokens += extraTokens;
            streamSession.usageReservation.reservedCompletionTokens += extraTokens;
            streamSession.usageReservation.reservedTotalTokens += extraTokens;
            return true;
          } catch (error) {
            const code =
              error instanceof Error && "code" in error
                ? String((error as { code?: string }).code)
                : undefined;
            if (code !== "DAILY_QUOTA_EXCEEDED") {
              throw error;
            }

            await stopChatStreamForQuota({
              userId,
              plan,
              assistantMessageId: streamSession.assistantMessageId,
              content: assistantContent,
              model: streamSession.model,
              usageReservation: streamSession.usageReservation
            });
            enqueue({
              type: "quota_exceeded",
              error: QUOTA_EXCEEDED_STREAM_MESSAGE
            });
            closeStream();
            return false;
          }
        };

        try {
          const iterator = streamSession.upstream[Symbol.asyncIterator]();

          while (true) {
            const result = await Promise.race([iterator.next(), abortPromise]);
            if (result.done) {
              break;
            }

            if (upstreamAbortController.signal.aborted) {
              throw new DOMException("The operation was aborted.", "AbortError");
            }

            const chunk = result.value;
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (!delta) {
              continue;
            }

            const nextAssistantContent = `${assistantContent}${delta}`;
            const canEmitDelta = await Promise.race([
              chargeCompletionIfNeeded(nextAssistantContent),
              abortPromise
            ]);
            if (!canEmitDelta) {
              return;
            }

            assistantContent = nextAssistantContent;
            enqueue({ type: "delta", delta });
          }

          await finalizeChatStream({
            userId,
            plan,
            chatId: streamSession.chatId,
            assistantMessageId: streamSession.assistantMessageId,
            content: assistantContent,
            model: streamSession.model,
            promptMessages: messages,
            usageReservation: streamSession.usageReservation
          });

          enqueue({
            type: "done",
            model: streamSession.model,
            chatId: streamSession.chatId
          });
          closeStream();
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            await handleAbort();
            return;
          }

          const message = error instanceof Error ? error.message : "Unknown upstream error";
          await failChatStream({
            userId,
            assistantMessageId: streamSession.assistantMessageId,
            content: assistantContent || `Generation failed: ${message}`,
            model: streamSession.model,
            usageReservation: streamSession.usageReservation
          });
          enqueue({ type: "error", error: message });
          closeStream();
        } finally {
          unregisterAbortController?.();
          unregisterAbortController = null;
          releaseStreamSlot?.();
          releaseStreamSlot = null;
        }
      },
      cancel() {
        upstreamAbortController.abort();
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    unregisterAbortController?.();
    releaseStreamSlot?.();
    const message = error instanceof Error ? error.message : "Unknown server error";
    const code =
      error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : code === "DAILY_QUOTA_EXCEEDED" || code === "STREAM_CONCURRENCY_LIMIT"
          ? 429
          : 500;
    return Response.json({ error: message, code }, { status });
  }
}

