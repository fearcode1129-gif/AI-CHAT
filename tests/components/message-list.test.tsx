/* @vitest-environment jsdom */

import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MessageList } from "@/components/message-list";
import type { Message } from "@/lib/types";

const baseMessages: Message[] = [
  {
    id: "user-1",
    role: "user",
    content: "Question",
    createdAt: "21:10"
  },
  {
    id: "assistant-1",
    role: "assistant",
    content: "Answer",
    createdAt: "21:11",
    status: "done"
  }
];

function defineScrollMetrics(element: HTMLDivElement, metrics: {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
}) {
  let scrollHeight = metrics.scrollHeight;
  let clientHeight = metrics.clientHeight;
  let scrollTop = metrics.scrollTop;

  Object.defineProperties(element, {
    scrollHeight: {
      configurable: true,
      get: () => scrollHeight
    },
    clientHeight: {
      configurable: true,
      get: () => clientHeight
    },
    scrollTop: {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      }
    }
  });

  return {
    setScrollHeight: (value: number) => {
      scrollHeight = value;
    },
    setClientHeight: (value: number) => {
      clientHeight = value;
    },
    setScrollTop: (value: number) => {
      scrollTop = value;
    },
    getScrollTop: () => scrollTop
  };
}

describe("MessageList", () => {
  let resizeCallback: ResizeObserverCallback | null = null;
  let mutationCallback: MutationCallback | null = null;
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resizeCallback = null;
    mutationCallback = null;
    scrollIntoViewMock = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock
    });
    global.ResizeObserver = class ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe() {}

      disconnect() {}
    } as typeof ResizeObserver;
    global.MutationObserver = class MutationObserver {
      constructor(callback: MutationCallback) {
        mutationCallback = callback;
      }

      observe() {}

      disconnect() {}

      takeRecords() {
        return [];
      }
    } as typeof MutationObserver;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("auto-scrolls when new content arrives and the user is near the bottom", () => {
    const { container, rerender } = render(
      <MessageList messages={baseMessages} isGenerating={false} bottomOffset={240} />
    );
    const scrollContainer = container.firstChild as HTMLDivElement;
    const metrics = defineScrollMetrics(scrollContainer, {
      scrollHeight: 1200,
      clientHeight: 500,
      scrollTop: 690
    });

    act(() => {
      fireEvent.scroll(scrollContainer);
    });
    scrollIntoViewMock.mockClear();

    metrics.setScrollHeight(1500);

    rerender(
      <MessageList
        messages={[
          ...baseMessages,
          {
            id: "assistant-2",
            role: "assistant",
            content: "More content",
            createdAt: "21:12",
            status: "streaming"
          }
        ]}
        isGenerating
        bottomOffset={240}
      />
    );

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("stops auto-scroll when the user has scrolled up, then resumes near the bottom", () => {
    const { container, rerender } = render(
      <MessageList messages={baseMessages} isGenerating={false} bottomOffset={240} />
    );
    const scrollContainer = container.firstChild as HTMLDivElement;
    const metrics = defineScrollMetrics(scrollContainer, {
      scrollHeight: 1200,
      clientHeight: 500,
      scrollTop: 300
    });

    act(() => {
      fireEvent.scroll(scrollContainer);
    });
    scrollIntoViewMock.mockClear();

    metrics.setScrollHeight(1500);

    rerender(
      <MessageList
        messages={[
          ...baseMessages,
          {
            id: "assistant-2",
            role: "assistant",
            content: "Streaming chunk 1",
            createdAt: "21:12",
            status: "streaming"
          }
        ]}
        isGenerating
        bottomOffset={240}
      />
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    metrics.setScrollTop(910);
    metrics.setClientHeight(500);
    metrics.setScrollHeight(1500);

    act(() => {
      fireEvent.scroll(scrollContainer);
    });

    metrics.setScrollHeight(1700);

    rerender(
      <MessageList
        messages={[
          ...baseMessages,
          {
            id: "assistant-2",
            role: "assistant",
            content: "Streaming chunk 2",
            createdAt: "21:12",
            status: "streaming"
          }
        ]}
        isGenerating
        bottomOffset={240}
      />
    );

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("keeps following when the content height grows during streaming", () => {
    const { container } = render(
      <MessageList messages={baseMessages} isGenerating bottomOffset={240} />
    );
    const scrollContainer = container.firstChild as HTMLDivElement;
    const metrics = defineScrollMetrics(scrollContainer, {
      scrollHeight: 1200,
      clientHeight: 500,
      scrollTop: 700
    });

    act(() => {
      fireEvent.scroll(scrollContainer);
    });
    scrollIntoViewMock.mockClear();

    metrics.setScrollHeight(1500);

    act(() => {
      resizeCallback?.([] as ResizeObserverEntry[], {} as ResizeObserver);
    });

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("keeps following when streaming mutates the current assistant message content", () => {
    const { container } = render(
      <MessageList messages={baseMessages} isGenerating bottomOffset={240} />
    );
    const scrollContainer = container.firstChild as HTMLDivElement;
    const metrics = defineScrollMetrics(scrollContainer, {
      scrollHeight: 1200,
      clientHeight: 500,
      scrollTop: 710
    });

    act(() => {
      fireEvent.scroll(scrollContainer);
    });
    scrollIntoViewMock.mockClear();

    metrics.setScrollHeight(1650);

    act(() => {
      mutationCallback?.([] as MutationRecord[], {} as MutationObserver);
    });

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("uses the provided bottom offset as the anchor safety space", () => {
    const { container } = render(
      <MessageList messages={baseMessages} isGenerating={false} bottomOffset={260} />
    );
    const scrollContainer = container.firstChild as HTMLDivElement;
    const innerContent = scrollContainer.firstElementChild as HTMLDivElement;
    const anchor = innerContent.lastElementChild as HTMLDivElement;

    expect(scrollContainer.style.scrollPaddingBottom).toBe("260px");
    expect(anchor.style.height).toBe("260px");
  });
});
