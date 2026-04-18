"use client";

import { useEffect, useState } from "react";

type ChatRenameDialogProps = {
  open: boolean;
  initialValue: string;
  onClose: () => void;
  onConfirm: (title: string) => void;
};

export function ChatRenameDialog({
  open,
  initialValue,
  onClose,
  onConfirm
}: ChatRenameDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [initialValue, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(45,51,55,0.18)] p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-card p-6 shadow-float ring-1 ring-[var(--outline-soft)]">
        <h3 className="font-display text-xl font-bold text-text-primary">重命名会话</h3>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          修改这条历史会话的标题，方便后续快速查找。
        </p>
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && value.trim()) {
              onConfirm(value);
            }
            if (event.key === "Escape") {
              onClose();
            }
          }}
          className="mt-5 w-full rounded-2xl border border-[var(--outline-light)] bg-surface-low px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
          placeholder="输入新的会话名称"
        />
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill bg-surface-low px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-high"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-highest disabled:text-text-muted"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
