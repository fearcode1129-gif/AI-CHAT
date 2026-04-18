"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  0: BrowserSpeechRecognitionAlternative;
  length: number;
};

type BrowserSpeechRecognitionResultList = {
  [index: number]: BrowserSpeechRecognitionResult;
  length: number;
};

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type UseBrowserSpeechInputArgs = {
  value: string;
  onChange: (value: string) => void;
  lang?: string;
};

export function useBrowserSpeechInput({
  value,
  onChange,
  lang = "zh-CN"
}: UseBrowserSpeechInputArgs) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const baseValueRef = useRef("");
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
      }

      onChange(`${baseValueRef.current}${transcript}`.trimStart());
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [lang, onChange]);

  const actions = useMemo(
    () => ({
      start: () => {
        const recognition = recognitionRef.current;
        if (!recognition) {
          return;
        }

        baseValueRef.current = value.trim()
          ? `${value.trimEnd()}${value.endsWith("\n") ? "" : " "}`
          : "";
        recognition.lang = lang;
        recognition.start();
      },
      stop: () => {
        recognitionRef.current?.stop();
      },
      toggle: () => {
        if (!recognitionRef.current) {
          return;
        }

        if (isRecording) {
          recognitionRef.current.stop();
          return;
        }

        baseValueRef.current = value.trim()
          ? `${value.trimEnd()}${value.endsWith("\n") ? "" : " "}`
          : "";
        recognitionRef.current.lang = lang;
        recognitionRef.current.start();
      }
    }),
    [isRecording, lang, value]
  );

  return {
    isSupported,
    isRecording,
    start: actions.start,
    stop: actions.stop,
    toggle: actions.toggle
  };
}
