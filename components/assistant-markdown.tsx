"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type AssistantMarkdownProps = {
  content: string;
};

export function AssistantMarkdown({ content }: AssistantMarkdownProps) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
}
