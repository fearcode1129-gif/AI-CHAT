import type { ChatSummary, Message, UsageCredits } from "@/shared/types";

export type StreamEvent =
  | { type: "meta"; chatId?: string; model?: string }
  | { type: "delta"; delta: string }
  | { type: "done"; chatId?: string; model?: string }
  | { type: "error"; error?: string };

export type StreamChatRequest = {
  chatId?: string;
  title?: string;
  mode?: string;
  attachmentIds?: string[];
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
};

export type CreateChatRequest = {
  title?: string;
  model?: string;
};

export type UpdateChatRequest = {
  title?: string;
  pinned?: boolean;
  model?: string;
};

export type ChatsResponse = ChatSummary[];
export type MessagesResponse = Message[];

export type UploadFilesResponse = Array<{
  id: string;
  name: string;
  kind: "file" | "image" | "knowledge";
  size: string;
  url?: string;
  mimeType?: string;
}>;

export type GenerateImageRequest = {
  chatId?: string;
  prompt: string;
  title: string;
};

export type GenerateImageResponse = {
  chatId: string;
  model: string;
  content: string;
  imageUrl: string;
};

export type UsageResponse = UsageCredits;
