import clsx from "clsx";

import { iconMap, type IconName } from "@/shared/lib/icon-map";
import type { Capability, Suggestion } from "@/shared/types";

type EmptyHomeProps = {
  suggestions: Suggestion[];
  capabilities: Capability[];
  isHydrating: boolean;
  onSuggestionSelect: (text: string) => void;
  onCapabilitySelect: (label: string) => void;
};

export function EmptyHome({
  suggestions,
  capabilities,
  isHydrating,
  onSuggestionSelect,
  onCapabilitySelect
}: EmptyHomeProps) {
  return (
    <div className="-mt-10 mx-auto flex w-full max-w-stage flex-col items-center lg:-mt-16">
      <div className="mb-10 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft shadow-[inset_0_0_0_1px_rgb(var(--primary-rgb)/0.12)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-primary shadow-soft">
          <span className="font-display text-2xl font-bold">AI</span>
        </div>
      </div>

      <div className="max-w-3xl text-center">
        <h1 className="font-display text-[2.75rem] font-bold leading-[1.08] tracking-[-0.04em] text-text-primary sm:text-[3.25rem] lg:text-[3.85rem]">
          有什么我能帮你吗？
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-text-secondary sm:text-lg">
          我是你的 AI 助手，可协助你进行创作、研究、编程、总结与多模态任务处理。
        </p>
      </div>

      <div className="mt-12 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        {isHydrating ? (
          <div className="md:col-span-3 rounded-xl bg-card/60 px-6 py-5 text-center text-sm text-text-muted shadow-soft ring-1 ring-[var(--outline-soft)]">
            正在加载你的工作区...
          </div>
        ) : null}
        {suggestions.map((suggestion) => {
          const Icon = iconMap[suggestion.icon as IconName];

          return (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => onSuggestionSelect(suggestion.title)}
              className="group rounded-lg bg-card/88 p-6 text-left shadow-soft ring-1 ring-[var(--outline-soft)] transition duration-200 hover:-translate-y-0.5 hover:bg-card"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-low">
                  <Icon className={clsx("h-5 w-5", suggestion.accent)} />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                  {suggestion.category}
                </span>
              </div>
              <p className="text-[15px] font-medium leading-7 text-text-primary transition group-hover:text-primary">
                {suggestion.title}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {capabilities.map((capability) => (
          <button
            key={capability.id}
            type="button"
            onClick={() => onCapabilitySelect(capability.label)}
            className="rounded-pill bg-surface-low px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-high hover:text-text-primary"
          >
            {capability.label}
          </button>
        ))}
      </div>
    </div>
  );
}
