"use client";

import React, { useEffect, useState } from "react";
import type { BundledLanguage, BundledTheme, HighlighterGeneric } from "shiki";

type ShikiCodeBlockProps = {
  code: string;
  language?: string;
};

const SUPPORTED_LANGUAGES = [
  "bash",
  "css",
  "html",
  "javascript",
  "json",
  "jsx",
  "markdown",
  "shell",
  "ts",
  "tsx",
  "typescript"
] as const satisfies BundledLanguage[];

const SUPPORTED_LANGUAGE_SET = new Set<string>(SUPPORTED_LANGUAGES);

let highlighterPromise: Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> | null = null;
let loadedHighlighter: HighlighterGeneric<BundledLanguage, BundledTheme> | null = null;
const highlightedCodeCache = new Map<string, string>();

function normalizeLanguage(language?: string) {
  const normalized = language?.toLowerCase();

  if (!normalized) {
    return "text";
  }

  if (normalized === "js") {
    return "javascript";
  }

  if (normalized === "sh" || normalized === "zsh" || normalized === "powershell") {
    return "bash";
  }

  return SUPPORTED_LANGUAGE_SET.has(normalized) ? normalized : "text";
}

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(({ createHighlighter }) =>
      createHighlighter({
        themes: ["github-dark"],
        langs: SUPPORTED_LANGUAGES
      }).then((highlighter) => {
        loadedHighlighter = highlighter;
        return highlighter;
      })
    );
  }

  return highlighterPromise;
}

function highlightCode(code: string, lang: string, cacheKey: string) {
  const cachedHtml = highlightedCodeCache.get(cacheKey);
  if (cachedHtml) {
    return cachedHtml;
  }

  if (!loadedHighlighter) {
    return null;
  }

  const nextHtml = loadedHighlighter.codeToHtml(code, {
    lang,
    theme: "github-dark"
  });
  highlightedCodeCache.set(cacheKey, nextHtml);
  return nextHtml;
}

export function ShikiCodeBlock({ code, language }: ShikiCodeBlockProps) {
  const lang = normalizeLanguage(language);
  const cacheKey = `${lang}:${code}`;
  const syncHtml = highlightCode(code, lang, cacheKey);
  const [html, setHtml] = useState<string | null>(syncHtml);

  useEffect(() => {
    let cancelled = false;
    const nextHtml = highlightCode(code, lang, cacheKey);

    if (nextHtml) {
      setHtml(nextHtml);
      return () => {
        cancelled = true;
      };
    }

    getHighlighter()
      .then((highlighter) => {
        const nextHtml = highlighter.codeToHtml(code, {
          lang,
          theme: "github-dark"
        });

        highlightedCodeCache.set(cacheKey, nextHtml);
        if (!cancelled) {
          setHtml(nextHtml);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHtml(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, code, lang]);

  const renderHtml = syncHtml ?? html;

  if (!renderHtml) {
    return (
      <pre>
        <code>{code}</code>
      </pre>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: renderHtml }} />;
}
