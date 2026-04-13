import type { Capability, ChatSummary, Message, NavItem, Suggestion, ToolMode } from "@/lib/types";

export const navItems: NavItem[] = [{ id: "home", label: "\u9996\u9875", icon: "Home" }];

export const recentChats: ChatSummary[] = [];

export const suggestions: Suggestion[] = [
  {
    id: "s1",
    category: "\u8d44\u8baf",
    title:
      "\u5e2e\u6211\u62c6\u89e3 AI \u5728\u73b0\u4ee3\u4f9b\u5e94\u94fe\u8c03\u5ea6\u4e2d\u7684\u6838\u5fc3\u7b97\u6cd5\u4e0e\u843d\u5730\u8def\u5f84\u3002",
    icon: "Newspaper",
    accent: "text-info"
  },
  {
    id: "s2",
    category: "\u7f16\u7a0b",
    title:
      "\u4e3a\u4e00\u4e2a AI Chat \u4ea7\u54c1\u8bbe\u8ba1 Next.js \u524d\u7aef\u67b6\u6784\u548c\u7ec4\u4ef6\u8fb9\u754c\u3002",
    icon: "Code2",
    accent: "text-primary"
  },
  {
    id: "s3",
    category: "\u5b66\u672f",
    title:
      "\u7528\u76f4\u89c2\u65b9\u5f0f\u89e3\u91ca Transformer\u3001RAG \u4e0e Agent \u7684\u5173\u7cfb\u3002",
    icon: "BrainCircuit",
    accent: "text-rose-500"
  }
];

export const capabilities: Capability[] = [
  { id: "writing", label: "\u5199\u4f5c" },
  { id: "summary", label: "\u603b\u7ed3" },
  { id: "code", label: "\u4ee3\u7801" },
  { id: "image", label: "\u56fe\u50cf" },
  { id: "translate", label: "\u7ffb\u8bd1" },
  { id: "sheet", label: "\u8868\u683c\u5206\u6790" },
  { id: "ppt", label: "PPT \u751f\u6210" }
];

export const toolModes: ToolMode[] = [
  { id: "attach", label: "\u6dfb\u52a0\u9644\u4ef6", icon: "Plus" },
  { id: "fast", label: "\u5feb\u901f\u6a21\u5f0f", icon: "Zap" },
  { id: "code", label: "\u7f16\u7a0b\u6a21\u5f0f", icon: "Code2" },
  { id: "write", label: "\u5199\u4f5c\u6a21\u5f0f", icon: "PenSquare" },
  { id: "image", label: "\u56fe\u50cf\u751f\u6210", icon: "Image" },
  { id: "knowledge", label: "\u77e5\u8bc6\u68c0\u7d22", icon: "DatabaseZap" }
];

export const seededMessages: Record<string, Message[]> = {};
