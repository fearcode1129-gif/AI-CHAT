import type { Capability, ChatSummary, Message, NavItem, Suggestion, ToolMode } from "@/shared/types";

export const navItems: NavItem[] = [{ id: "home", label: "首页", icon: "Home" }];

export const recentChats: ChatSummary[] = [];

export const suggestions: Suggestion[] = [
  {
    id: "s1",
    category: "资讯",
    title: "帮我拆解 AI 在现代供应链调度中的核心算法与落地路径。",
    icon: "Newspaper",
    accent: "text-info"
  },
  {
    id: "s2",
    category: "编程",
    title: "为一个 AI Chat 产品设计 Next.js 前端架构和组件边界。",
    icon: "Code2",
    accent: "text-primary"
  },
  {
    id: "s3",
    category: "学术",
    title: "用直观方式解释 Transformer、RAG 与 Agent 的关系。",
    icon: "BrainCircuit",
    accent: "text-rose-500"
  }
];

export const capabilities: Capability[] = [
  { id: "writing", label: "写作" },
  { id: "summary", label: "总结" },
  { id: "code", label: "代码" },
  { id: "image", label: "图像" },
  { id: "translate", label: "翻译" },
  { id: "sheet", label: "表格分析" },
  { id: "ppt", label: "PPT 生成" }
];

export const toolModes: ToolMode[] = [
  { id: "attach", label: "添加附件", icon: "Plus" },
  { id: "fast", label: "快速模式", icon: "Zap" },
  { id: "code", label: "编程模式", icon: "Code2" },
  { id: "write", label: "写作模式", icon: "PenSquare" },
  { id: "image", label: "图像生成", icon: "Image" },
  { id: "knowledge", label: "知识检索", icon: "DatabaseZap" }
];

export const seededMessages: Record<string, Message[]> = {};
