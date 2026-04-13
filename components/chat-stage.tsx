"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";

import { EmptyHome } from "@/components/empty-home";
import type { Capability, ChatSummary, Message, Suggestion } from "@/lib/types";

const MessageList = dynamic(
  async () => {
    const module = await import("@/components/message-list");
    return module.MessageList;
  },
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto flex h-full w-full max-w-chat items-center justify-center rounded-2xl bg-white/40 text-sm text-text-muted">
        正在加载对话内容...
      </div>
    )
  }
);

type ChatStageProps = {
  activeChat: ChatSummary | null;
  messages: Message[];
  composerDockOffset: number;
  suggestions: Suggestion[];
  capabilities: Capability[];
  isGenerating: boolean;
  activeModel: string | null;
  isHydrating: boolean;
  onSuggestionSelect: (text: string) => void;
  onCapabilitySelect: (label: string) => void;
};

export function ChatStage({
  activeChat,
  messages,
  composerDockOffset,
  suggestions,
  capabilities,
  isGenerating,
  activeModel,
  isHydrating,
  onSuggestionSelect,
  onCapabilitySelect
}: ChatStageProps) {
  const isEmpty = messages.length === 0;
  const messageViewportGap = 24;
  const chatTitle =
    activeChat?.title ??
    (messages.find((message) => message.role === "user")?.content.slice(0, 18) || "新对话");

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-hero-glow opacity-80" />
      <div
        className="absolute inset-x-0 top-0 z-0 flex flex-col overflow-hidden px-5 pt-6 lg:px-10 lg:pt-8"
        style={{ bottom: `${composerDockOffset}px` }}
      >
        <header className="mb-6 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-soft">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-base font-bold">The Digital Curator</p>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">AI Assistant</p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card/70 text-text-secondary shadow-soft"
            aria-label="Open assistant menu"
          >
            <Bot className="h-4 w-4" />
          </button>
        </header>

        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-1 items-center justify-center"
            >
              <EmptyHome
                suggestions={suggestions}
                capabilities={capabilities}
                isHydrating={isHydrating}
                onSuggestionSelect={onSuggestionSelect}
                onCapabilitySelect={onCapabilitySelect}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="mx-auto mb-6 flex w-full max-w-chat items-center justify-between rounded-xl bg-card/50 px-5 py-4 backdrop-blur-sm">
                <div>
                  <h1 className="font-display text-xl font-bold tracking-tight text-text-primary">
                    {chatTitle}
                  </h1>
                  <p className="mt-1 text-sm text-text-secondary">
                    {activeModel ?? "未选择模型"} 路 可扩展为收藏、分享、重命名与模型切换
                  </p>
                </div>
                <div className="hidden items-center gap-2 md:flex">
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                    Streaming Ready
                  </span>
                  <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-text-secondary">
                    {isGenerating ? "生成中" : "已就绪"}
                  </span>
                </div>
              </div>

              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <MessageList
                  messages={messages}
                  isGenerating={isGenerating}
                  bottomOffset={messageViewportGap}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
