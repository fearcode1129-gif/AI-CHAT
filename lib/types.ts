export type NavItem = {
  id: string;
  label: string;
  icon: string;
};

export type WorkspaceSection =
  | "home"
  | "settings"
  | "help";

export type Suggestion = {
  id: string;
  category: string;
  title: string;
  icon: string;
  accent: string;
};

export type Capability = {
  id: string;
  label: string;
};

export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
  pinned?: boolean;
  model?: string;
};

export type Attachment = {
  id: string;
  name: string;
  kind: "file" | "image" | "knowledge";
  size: string;
  url?: string;
  mimeType?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: "done" | "streaming" | "error";
  attachments?: Attachment[];
  model?: string;
};

export type ToolMode = {
  id: string;
  label: string;
  icon: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  plan: string;
};

export type UsageCredits = {
  plan: string;
  tierLabel: string;
  memberLabel: string;
  limitTokens: number;
  usedTokens: number;
  remainingTokens: number;
  percentUsed: number;
  isExceeded: boolean;
  isNearLimit: boolean;
  dateKey: string;
};
