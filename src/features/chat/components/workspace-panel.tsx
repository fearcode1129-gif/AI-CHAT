import { LifeBuoy, Settings2, type LucideIcon } from "lucide-react";

import type { WorkspaceSection } from "@/shared/types";

type WorkspacePanelProps = {
  section: Exclude<WorkspaceSection, "home">;
};

const contentMap = {
  settings: {
    icon: Settings2,
    eyebrow: "Settings",
    title: "模型与账户设置",
    description:
      "这里作为设置模块的产品化页面，后续可以继续接入默认模型、语言偏好、账户资料和订阅计划等用户能力。",
    bullets: ["默认模型配置", "语言与界面偏好", "账户资料与订阅信息"]
  },
  help: {
    icon: LifeBuoy,
    eyebrow: "Help",
    title: "帮助与接入说明",
    description:
      "这里作为帮助模块的承接页面，后续可以继续放置新手引导、常见问题、功能说明与错误排查文档。",
    bullets: ["快速上手指南", "功能与模型说明", "常见问题与联系支持"]
  }
} satisfies Record<
  Exclude<WorkspaceSection, "home">,
  {
    icon: LucideIcon;
    eyebrow: string;
    title: string;
    description: string;
    bullets: string[];
  }
>;

export function WorkspacePanel({ section }: WorkspacePanelProps) {
  const content = contentMap[section];
  const Icon = content.icon;

  return (
    <div className="mx-auto flex w-full max-w-stage flex-1 flex-col justify-center">
      <div className="rounded-[32px] bg-card/70 p-8 shadow-soft ring-1 ring-[var(--outline-soft)] backdrop-blur-sm lg:p-10">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              {content.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-text-primary">
              {content.title}
            </h2>
          </div>
        </div>

        <p className="max-w-2xl text-base leading-8 text-text-secondary">{content.description}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {content.bullets.map((bullet) => (
            <div
              key={bullet}
              className="rounded-xl bg-surface-low px-5 py-4 text-sm font-medium text-text-secondary"
            >
              {bullet}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-surface-low px-5 py-5 text-sm leading-7 text-text-secondary">
          <p>
            这个模块目前仍然是承接页面，但已经保留了完整的入口路径和版式容器。后续如果继续产品化，我们可以直接在这里扩展真实功能，而不需要再调整整体布局结构。
          </p>
        </div>
      </div>
    </div>
  );
}
