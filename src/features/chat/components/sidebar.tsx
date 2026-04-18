"use client";

import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import {
  LogOut,
  Palette,
  PanelLeftClose,
  Pencil,
  Pin,
  Plus,
  Sparkles,
  Trash2,
  UserRound
} from "lucide-react";

import { ChatDeleteDialog } from "@/features/chat/components/chat-delete-dialog";
import { ChatRenameDialog } from "@/features/chat/components/chat-rename-dialog";
import { useAccentTheme } from "@/features/theme/hooks/use-accent-theme";
import { iconMap, type IconName } from "@/shared/lib/icon-map";
import { navItems } from "@/features/chat/mock-data";
import type { ChatSummary, CurrentUser, UsageCredits, WorkspaceSection } from "@/shared/types";

type SidebarProps = {
  currentUser: CurrentUser;
  usage: UsageCredits | null;
  usageError: string | null;
  isUsageLoading: boolean;
  chats: ChatSummary[];
  activeChatId: string | null;
  activeSection: WorkspaceSection;
  onSelectChat: (id: string) => void;
  onSelectSection: (section: WorkspaceSection) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, title: string) => void;
  onTogglePinnedChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
};

function formatCompactTokenCount(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return `${value}`;
}

function formatPlan(plan: string) {
  if (plan === "pro") {
    return "\u4e13\u4e1a\u4f1a\u5458";
  }

  if (plan === "enterprise") {
    return "\u4f01\u4e1a\u7248";
  }

  return "\u514d\u8d39\u4f1a\u5458";
}

export function Sidebar({
  currentUser,
  usage,
  usageError,
  isUsageLoading,
  chats,
  activeChatId,
  activeSection,
  onSelectChat,
  onSelectSection,
  onNewChat,
  onRenameChat,
  onTogglePinnedChat,
  onDeleteChat
}: SidebarProps) {
  const [renamingChat, setRenamingChat] = useState<ChatSummary | null>(null);
  const [deletingChat, setDeletingChat] = useState<ChatSummary | null>(null);
  const { themeLabel, cycleTheme } = useAccentTheme();

  const usageText = useMemo(() => {
    if (isUsageLoading) {
      return "\u4eca\u65e5\u989d\u5ea6\u52a0\u8f7d\u4e2d...";
    }

    if (!usage) {
      return usageError ?? "\u6682\u65f6\u65e0\u6cd5\u83b7\u53d6\u4eca\u65e5\u989d\u5ea6\u3002";
    }

    return `\u672c\u6b21\u989d\u5ea6 ${formatCompactTokenCount(usage.usedTokens)} / ${formatCompactTokenCount(usage.limitTokens)}`;
  }, [isUsageLoading, usage, usageError]);

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[292px] lg:flex-col lg:bg-surface-low/85 lg:px-4 lg:py-5 lg:backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary shadow-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="truncate font-display text-[1.05rem] font-bold tracking-tight text-text-primary">
            {"AI\u52a9\u624b"}
          </p>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="mb-6 inline-flex items-center justify-center gap-2 rounded-pill bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          {"\u65b0\u5efa\u5bf9\u8bdd"}
        </button>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon as IconName];

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id as WorkspaceSection)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm transition",
                  activeSection === item.id
                    ? "bg-surface-high text-text-primary"
                    : "text-text-secondary hover:bg-surface-mid hover:text-text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="mt-8 flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between px-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
              {"\u6700\u8fd1\u4f1a\u8bdd"}
            </p>
            <PanelLeftClose className="h-4 w-4 text-text-muted" />
          </div>
          <div className="soft-scrollbar space-y-1 overflow-y-auto pr-1">
            {chats.length ? (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={clsx(
                    "group rounded-md px-4 py-3 transition",
                    activeChatId === chat.id && activeSection === "home"
                      ? "bg-surface-highest shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                      : "hover:bg-surface-mid"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChat(chat.id)}
                    className="w-full text-left"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text-primary">{chat.title}</p>
                      {chat.pinned ? (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {"\u7f6e\u9876"}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-text-muted">{chat.updatedAt}</p>
                  </button>
                  <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={`\u91cd\u547d\u540d ${chat.title}`}
                      onClick={() => setRenamingChat(chat)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition hover:bg-white hover:text-text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={chat.pinned ? `\u53d6\u6d88\u7f6e\u9876 ${chat.title}` : `\u7f6e\u9876 ${chat.title}`}
                      onClick={() => void onTogglePinnedChat(chat.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition hover:bg-white hover:text-text-primary"
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`\u5220\u9664 ${chat.title}`}
                      onClick={() => setDeletingChat(chat)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition hover:bg-white hover:text-error"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md px-4 py-5 text-sm leading-6 text-text-muted">
                {"\u8fd8\u6ca1\u6709\u5386\u53f2\u4f1a\u8bdd\u3002\u70b9\u51fb\u201c\u65b0\u5efa\u5bf9\u8bdd\u201d\u6216\u76f4\u63a5\u63d0\u95ee\u540e\uff0c\u8fd9\u91cc\u4f1a\u51fa\u73b0\u8bb0\u5f55\u3002"}
              </div>
            )}
          </div>
        </section>

        <div className="mt-5 border-t border-[var(--outline-soft)] pt-4">
          <button
            type="button"
            onClick={cycleTheme}
            className="flex w-full items-center justify-between rounded-md px-4 py-3 text-sm text-text-secondary transition hover:bg-surface-mid hover:text-text-primary"
          >
            <span className="inline-flex items-center gap-3">
              <Palette className="h-4 w-4" />
              {"\u4e3b\u9898\u6a21\u5f0f"}
            </span>
            <span className="rounded-full bg-card/70 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {themeLabel}
            </span>
          </button>

          <div className="mt-3 space-y-3">
            <div className="rounded-[24px] border border-[var(--outline-soft)] bg-card/72 px-4 py-4 shadow-soft backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {"\u4f7f\u7528\u989d\u5ea6"}
                </p>
                <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
                  {usage?.tierLabel ?? "\u514d\u8d39\u7248"}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-text-secondary">{usageText}</p>

                <div className="h-2.5 overflow-hidden rounded-full bg-surface-mid">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      usage?.isExceeded
                        ? "bg-error"
                        : usage?.isNearLimit
                          ? "bg-warning"
                          : "bg-primary"
                    )}
                    style={{ width: `${usage?.percentUsed ?? 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <span
                    className={clsx(
                      "font-medium",
                      usage?.isExceeded
                        ? "text-error"
                        : usage?.isNearLimit
                          ? "text-warning"
                          : "text-text-muted"
                    )}
                  >
                    {usage?.isExceeded
                      ? "\u4eca\u65e5\u989d\u5ea6\u5df2\u7528\u5b8c"
                      : usage
                        ? `\u5269\u4f59 ${formatCompactTokenCount(usage.remainingTokens)}`
                        : "\u989d\u5ea6\u72b6\u6001\u7a0d\u540e\u5237\u65b0"}
                  </span>
                  <span className="text-text-muted">{"\u6bcf\u65e5 0 \u70b9\u66f4\u65b0"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--outline-soft)] bg-card/72 px-4 py-4 shadow-soft backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-mid">
                  <UserRound className="h-6 w-6 text-text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-text-primary">{currentUser.name}</p>
                  <p className="truncate text-sm text-text-muted">{currentUser.email}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text-muted">
                  {usage?.memberLabel ?? formatPlan(currentUser.plan)}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/sign-in" })}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition hover:text-text-primary"
                >
                  <LogOut className="h-4 w-4" />
                  {"\u9000\u51fa\u767b\u5f55"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <ChatRenameDialog
        open={Boolean(renamingChat)}
        initialValue={renamingChat?.title ?? ""}
        onClose={() => setRenamingChat(null)}
        onConfirm={(title) => {
          if (renamingChat && title.trim() && title.trim() !== renamingChat.title) {
            void onRenameChat(renamingChat.id, title.trim());
          }
          setRenamingChat(null);
        }}
      />
      <ChatDeleteDialog
        open={Boolean(deletingChat)}
        title={deletingChat?.title ?? ""}
        onClose={() => setDeletingChat(null)}
        onConfirm={() => {
          if (deletingChat) {
            void onDeleteChat(deletingChat.id);
          }
          setDeletingChat(null);
        }}
      />
    </>
  );
}
