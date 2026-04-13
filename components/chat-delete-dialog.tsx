"use client";

type ChatDeleteDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ChatDeleteDialog({
  open,
  title,
  onClose,
  onConfirm
}: ChatDeleteDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(45,51,55,0.18)] p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-card p-6 shadow-float ring-1 ring-[var(--outline-soft)]">
        <h3 className="font-display text-xl font-bold text-text-primary">删除会话</h3>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          确定要删除“{title}”吗？这会同时移除这条会话下的消息记录。
        </p>
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
            onClick={onConfirm}
            className="rounded-pill bg-error px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
