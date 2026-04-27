/* @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AssistantMarkdown } from "@/shared/components/assistant-markdown";

afterEach(() => {
  cleanup();
});

describe("AssistantMarkdown", () => {
  it("repairs incomplete markdown while streaming", () => {
    render(<AssistantMarkdown content="This is **important" isStreaming />);

    expect(screen.getByText("important").tagName).toBe("STRONG");
  });

  it("temporarily closes streaming code fences for preview rendering", () => {
    const { container } = render(
      <AssistantMarkdown content={"```ts\nconst value = 1"} isStreaming />
    );

    const code = container.querySelector("pre code");
    expect(code?.textContent).toContain("const value = 1");
  });

  it("renders completed markdown normally", () => {
    render(<AssistantMarkdown content="This is **important**" />);

    expect(screen.getByText("important").tagName).toBe("STRONG");
  });

  it("highlights fenced code blocks with Shiki", async () => {
    const { container } = render(
      <AssistantMarkdown content={"```ts\nconst value = 1;\n```"} />
    );

    await waitFor(() => {
      expect(container.querySelector(".shiki")).not.toBeNull();
    });
    expect(container.querySelector(".shiki")?.textContent).toContain("const value = 1;");
  });

  it("keeps the previous highlighted block while updated code is highlighting", async () => {
    const { container, rerender } = render(
      <AssistantMarkdown content={"```ts\nconst first = 1;\n```"} />
    );

    await waitFor(() => {
      expect(container.querySelector(".shiki")).not.toBeNull();
    });

    rerender(<AssistantMarkdown content={"```ts\nconst second = 2;\n```"} />);

    expect(container.querySelector(".shiki")).not.toBeNull();
  });
});
