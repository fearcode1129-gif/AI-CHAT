"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Mic, Paperclip, SendHorizonal, Square, X } from "lucide-react";

import { iconMap, type IconName } from "@/shared/lib/icon-map";
import type { Attachment, ToolMode } from "@/shared/types";

type BottomComposerProps = {
  value: string;
  activeMode: string;
  attachments: Attachment[];
  isGenerating: boolean;
  activeStreamCount: number;
  isRecording: boolean;
  isVoiceSupported: boolean;
  isQuotaExceeded: boolean;
  helperText: string;
  modes: ToolMode[];
  onChange: (value: string) => void;
  onModeChange: (modeId: string) => void;
  onAttachFiles: (files: File[]) => void;
  onUploadKnowledge: (files: File[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onDockOffsetChange: (offset: number) => void;
  onVoiceToggle: () => void;
  onSend: () => void;
  onStop: () => void;
};

export function BottomComposer({
  value,
  activeMode,
  attachments,
  isGenerating,
  activeStreamCount,
  isRecording,
  isVoiceSupported,
  isQuotaExceeded,
  helperText,
  modes,
  onChange,
  onModeChange,
  onAttachFiles,
  onUploadKnowledge,
  onRemoveAttachment,
  onDockOffsetChange,
  onVoiceToggle,
  onSend,
  onStop
}: BottomComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const knowledgeInputRef = useRef<HTMLInputElement>(null);
  const [toolbarInsetTop, setToolbarInsetTop] = useState(16);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [value]);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar || typeof window === "undefined") {
      return;
    }

    const updateDockOffset = () => {
      const toolbarRect = toolbar.getBoundingClientRect();
      const hostRect =
        toolbar.offsetParent instanceof HTMLElement
          ? toolbar.offsetParent.getBoundingClientRect()
          : { top: 0 };
      setToolbarInsetTop(Math.round(toolbarRect.top - hostRect.top));
      const nextOffset = Math.max(window.innerHeight - toolbarRect.top, 200);
      onDockOffsetChange(Math.round(nextOffset));
    };

    updateDockOffset();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            updateDockOffset();
          });

    resizeObserver?.observe(toolbar);
    window.addEventListener("resize", updateDockOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateDockOffset);
    };
  }, [attachments.length, onDockOffsetChange, value]);

  const isSendDisabled = !value.trim() || isQuotaExceeded;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[76px] z-30 px-4 pb-4 pt-10 lg:bottom-0 lg:left-[292px] lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-stage">
        <div className="pointer-events-auto relative rounded-[30px] px-2 pt-4">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 rounded-[30px] bg-surface"
            style={{ top: `${toolbarInsetTop}px` }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 rounded-t-[30px] bg-gradient-to-t from-surface via-surface to-surface/0"
            style={{
              top: `${Math.max(toolbarInsetTop - 56, 0)}px`,
              height: `${Math.min(toolbarInsetTop + 56, 112)}px`
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 rounded-[30px] backdrop-blur-2xl"
            style={{ top: `${toolbarInsetTop}px` }}
          />

          <div ref={toolbarRef} className="relative z-10 mb-3 flex gap-2 overflow-x-auto px-2 pb-1">
            {modes.map((mode) => {
              const Icon = iconMap[mode.icon as IconName];
              const isAttach = mode.id === "attach";

              return (
                <button
                  key={mode.id}
                  type="button"
                  aria-label={mode.label}
                  onClick={() => {
                    if (mode.id === "attach") {
                      attachmentInputRef.current?.click();
                      return;
                    }

                    if (mode.id === "knowledge") {
                      onModeChange(mode.id);
                      knowledgeInputRef.current?.click();
                      return;
                    }

                    onModeChange(mode.id);
                  }}
                  className={clsx(
                    "inline-flex shrink-0 items-center gap-2 rounded-pill border border-[var(--outline-soft)] bg-card/84 px-3 py-2 text-xs font-medium text-text-secondary backdrop-blur-xl transition hover:bg-card",
                    activeMode === mode.id && !isAttach && "bg-primary-soft text-primary"
                  )}
                >
                  {isAttach ? (
                    <Paperclip className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > 0) {
                onAttachFiles(files);
              }
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={knowledgeInputRef}
            type="file"
            multiple
            accept=".txt,.md,.json,.csv,text/plain,text/markdown,text/csv,application/json"
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length > 0) {
                onUploadKnowledge(files);
              }
              event.currentTarget.value = "";
            }}
          />

          <div className="glass-panel relative z-10 rounded-[28px] border border-[var(--outline-light)] shadow-float">
            {attachments.length ? (
              <div className="flex flex-wrap gap-2 border-b border-[var(--outline-soft)] px-5 py-4">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="inline-flex items-center gap-2 rounded-pill bg-surface-low px-3 py-2 text-xs text-text-secondary"
                  >
                    <span className="font-medium text-text-primary">{attachment.name}</span>
                    <span>{attachment.size}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(attachment.id)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-text-muted transition hover:bg-card hover:text-text-primary"
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-3 px-5 py-4">
              <textarea
                ref={textareaRef}
                value={value}
                rows={1}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (value.trim() && !isQuotaExceeded) {
                      onSend();
                    }
                  }
                }}
                placeholder="输入任何问题、任务或指令..."
                aria-label="Ask AI assistant"
                className="max-h-[180px] min-h-[44px] flex-1 bg-transparent py-2 text-[15px] leading-6 text-text-primary outline-none placeholder:text-text-muted"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={isRecording ? "Stop voice input" : "Voice input"}
                  onClick={onVoiceToggle}
                  disabled={!isVoiceSupported}
                  className={clsx(
                    "inline-flex h-11 w-11 items-center justify-center rounded-full transition",
                    !isVoiceSupported && "cursor-not-allowed text-text-muted opacity-50",
                    isVoiceSupported &&
                      !isRecording &&
                      "text-text-secondary hover:bg-surface-low hover:text-text-primary",
                    isRecording && "bg-primary-soft text-primary"
                  )}
                >
                  <Mic className="h-4 w-4" />
                </button>
                {isGenerating ? (
                  <button
                    type="button"
                    aria-label="Stop current chat generation"
                    onClick={onStop}
                    className="inline-flex h-11 min-w-[52px] items-center justify-center rounded-full bg-text-primary px-3 text-white shadow-soft transition hover:bg-black/80"
                  >
                    <Square className="h-4 w-4" />
                    <span className="ml-2 text-xs font-medium">{activeStreamCount}</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Send message"
                  onClick={onSend}
                  disabled={isSendDisabled}
                  className={clsx(
                    "inline-flex h-11 w-11 items-center justify-center rounded-full transition",
                    !isSendDisabled
                      ? "bg-primary text-white shadow-soft hover:bg-primary-hover"
                      : "cursor-not-allowed bg-surface-highest text-text-muted"
                  )}
                >
                  <SendHorizonal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <p className="relative z-10 px-3 pb-2 pt-3 text-center text-xs text-text-muted">
            {helperText}
          </p>
        </div>
      </div>
    </div>
  );
}
