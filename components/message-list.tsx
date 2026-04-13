import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef } from "react";
import clsx from "clsx";
import { Copy, RefreshCw, Share2, Star, ThumbsDown, ThumbsUp } from "lucide-react";

import type { Message } from "@/lib/types";

type MessageListProps = {
  messages: Message[];
  isGenerating: boolean;
  bottomOffset?: number;
};

const AUTO_SCROLL_THRESHOLD = 120;
const MESSAGE_BOTTOM_GAP = 24;
const AssistantMarkdown = lazy(async () => {
  const module = await import("@/components/assistant-markdown");
  return { default: module.AssistantMarkdown };
});

export function MessageList({ messages, isGenerating, bottomOffset = 0 }: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const frameRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    const anchor = bottomAnchorRef.current;
    if (!anchor || !shouldAutoScrollRef.current) {
      return;
    }

    anchor.scrollIntoView({ block: "end" });
  };

  const scheduleScrollToBottom = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      scrollToBottom();
      frameRef.current = requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
  };

  const updateAutoScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
  };

  useLayoutEffect(() => {
    if (!messages.length) {
      return;
    }

    scheduleScrollToBottom();
  }, [messages, isGenerating]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            scheduleScrollToBottom();
          });
    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            scheduleScrollToBottom();
          });

    resizeObserver?.observe(content);
    mutationObserver?.observe(content, {
      childList: true,
      characterData: true,
      subtree: true
    });

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, []);

  const safeBottomOffset = Math.max(bottomOffset, MESSAGE_BOTTOM_GAP);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={updateAutoScrollState}
      className="soft-scrollbar flex h-full min-h-0 w-full flex-1 flex-col overflow-y-scroll pr-1"
      style={{
        paddingBottom: `${MESSAGE_BOTTOM_GAP}px`,
        scrollPaddingBottom: `${safeBottomOffset}px`
      }}
    >
      <div ref={contentRef} className="mx-auto flex w-full max-w-chat flex-col gap-5">
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";

          return (
            <div
              key={message.id}
              className={clsx("flex", isAssistant ? "justify-start" : "justify-end")}
            >
              <div className={clsx("max-w-[92%]", isAssistant ? "w-full" : "max-w-[72%]")}>
                {!isAssistant && message.attachments?.length ? (
                  <div className="mb-3 flex flex-wrap justify-end gap-2">
                    {message.attachments.map((attachment) => (
                      <span
                        key={attachment.id}
                        className="rounded-pill bg-card px-3 py-1 text-xs font-medium text-text-secondary shadow-soft ring-1 ring-[var(--outline-soft)]"
                      >
                        {attachment.name} 路 {attachment.size}
                      </span>
                    ))}
                  </div>
                ) : null}

                <article
                  className={clsx(
                    "rounded-[28px] px-5 py-4",
                    isAssistant
                      ? message.status === "error"
                        ? "bg-red-50 shadow-soft ring-1 ring-red-200"
                        : "bg-card/92 shadow-soft ring-1 ring-[var(--outline-soft)]"
                      : "bg-[linear-gradient(135deg,#4C86FB_0%,#3875F6_100%)] text-white shadow-float"
                  )}
                >
                  {isAssistant ? (
                    <div
                      className={clsx(
                        "message-markdown text-[15px] leading-7",
                        message.status === "error" ? "text-red-700" : "text-text-secondary"
                      )}
                    >
                      <Suspense fallback={<p className="whitespace-pre-wrap">{message.content}</p>}>
                        <AssistantMarkdown content={message.content} />
                      </Suspense>
                      {message.status === "streaming" && isGenerating ? (
                        <span className="ml-1 inline-block h-5 w-2 animate-pulse rounded bg-primary/70 align-middle" />
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-[15px] leading-7 text-white/96">{message.content}</p>
                  )}
                </article>

                <div
                  className={clsx(
                    "mt-2 flex items-center gap-2 text-xs text-text-muted",
                    isAssistant ? "justify-between" : "justify-end"
                  )}
                >
                  <span>{message.createdAt}</span>
                  {isAssistant ? (
                    <div className="flex items-center gap-1">
                      {[Copy, RefreshCw, ThumbsUp, ThumbsDown, Star, Share2].map((Icon, index) => (
                        <button
                          key={index}
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition hover:bg-card hover:text-text-primary"
                          aria-label="Message action"
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        <div
          ref={bottomAnchorRef}
          aria-hidden="true"
          className="w-full shrink-0"
          style={{ height: `${safeBottomOffset}px` }}
        />
      </div>
    </div>
  );
}
