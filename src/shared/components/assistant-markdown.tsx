"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remend, { type RemendHandler } from "remend";
import remarkGfm from "remark-gfm";

import { ShikiCodeBlock } from "@/shared/components/shiki-code-block";

type AssistantMarkdownProps = {
  content: string;
  isStreaming?: boolean;
};

type MarkdownBlock = {
  id: number;
  content: string;
};

type StreamingMarkdownState = {
  blocks: MarkdownBlock[];
  liveBuffer: string;
  processedContent: string;
  nextBlockId: number;
};

const codeFenceHandler: RemendHandler = {
  name: "code-fence",
  handle: (text) => {
    const fences = text.match(/(^|\n)(```|~~~)/g) ?? [];
    if (fences.length % 2 === 0) {
      return text;
    }

    const lastFence = fences.at(-1)?.trim();
    return lastFence ? `${text}\n${lastFence}` : text;
  },
  priority: 80
};

function prepareStreamingMarkdown(content: string) {
  return remend(content, {
    handlers: [codeFenceHandler],
    linkMode: "text-only"
  });
}

function extractStableBlocks(buffer: string) {
  const stableBlocks: string[] = [];
  let stableEnd = 0;
  let lineStart = 0;
  let inFence = false;
  let activeFence: "```" | "~~~" | null = null;

  while (lineStart < buffer.length) {
    const nextNewline = buffer.indexOf("\n", lineStart);
    const lineEnd = nextNewline === -1 ? buffer.length : nextNewline + 1;
    const hasLineEnding = nextNewline !== -1;
    const line = buffer.slice(lineStart, lineEnd);
    const trimmedLine = line.trim();
    const fenceMatch = /^(```|~~~)/.exec(trimmedLine);

    if (fenceMatch) {
      const fence = fenceMatch[1] as "```" | "~~~";

      if (!inFence) {
        inFence = true;
        activeFence = fence;
      } else if (activeFence === fence) {
        inFence = false;
        activeFence = null;
        stableEnd = lineEnd;
      }
    } else if (!inFence && trimmedLine.length === 0 && hasLineEnding) {
      stableEnd = lineEnd;
    }

    lineStart = lineEnd;

    if (!hasLineEnding) {
      break;
    }
  }

  if (stableEnd > 0) {
    stableBlocks.push(buffer.slice(0, stableEnd));
  }

  return {
    stableBlocks,
    liveBuffer: buffer.slice(stableEnd)
  };
}

function createStreamingMarkdownState(content: string): StreamingMarkdownState {
  const { stableBlocks, liveBuffer } = extractStableBlocks(content);

  return {
    blocks: stableBlocks.map((block, index) => ({
      id: index,
      content: block
    })),
    liveBuffer,
    processedContent: content,
    nextBlockId: stableBlocks.length
  };
}

function appendStreamingContent(
  previous: StreamingMarkdownState,
  content: string
): StreamingMarkdownState {
  if (content === previous.processedContent) {
    return previous;
  }

  if (!content.startsWith(previous.processedContent)) {
    return createStreamingMarkdownState(content);
  }

  const appendedContent = content.slice(previous.processedContent.length);
  const nextBuffer = `${previous.liveBuffer}${appendedContent}`;
  const { stableBlocks, liveBuffer } = extractStableBlocks(nextBuffer);
  const nextBlocks = stableBlocks.map((block, index) => ({
    id: previous.nextBlockId + index,
    content: block
  }));

  return {
    blocks: [...previous.blocks, ...nextBlocks],
    liveBuffer,
    processedContent: content,
    nextBlockId: previous.nextBlockId + nextBlocks.length
  };
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className ?? "");
          const code = String(children).replace(/\n$/, "");

          if (match) {
            return <ShikiCodeBlock code={code} language={match[1]} />;
          }

          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

const StableMarkdownBlock = memo(function StableMarkdownBlock({ content }: { content: string }) {
  return <MarkdownRenderer content={content} />;
});

function StreamingMarkdown({ content }: { content: string }) {
  const [state, setState] = useState(() => createStreamingMarkdownState(content));
  const previewContent = useMemo(
    () => prepareStreamingMarkdown(state.liveBuffer),
    [state.liveBuffer]
  );

  useEffect(() => {
    setState((previous) => appendStreamingContent(previous, content));
  }, [content]);

  return (
    <>
      {state.blocks.map((block) => (
        <StableMarkdownBlock key={block.id} content={block.content} />
      ))}
      {previewContent ? <MarkdownRenderer content={previewContent} /> : null}
    </>
  );
}

export function AssistantMarkdown({ content, isStreaming = false }: AssistantMarkdownProps) {
  if (isStreaming) {
    return <StreamingMarkdown content={content} />;
  }

  return <MarkdownRenderer content={content} />;
}
