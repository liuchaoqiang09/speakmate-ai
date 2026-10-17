"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 对应 PRD 6.3 中与本次语音输入相关的状态。 */
export type SpeechPhase =
  | "idle"
  | "requesting"
  | "listening"
  | "recognizing"
  | "error";

type SpeechResult = {
  isFinal: boolean;
  0?: { transcript: string };
};

type SpeechResultEvent = {
  results: ArrayLike<SpeechResult>;
};

type SpeechErrorEvent = {
  error?: string;
};

type BrowserRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
};

type RecognitionConstructor = new () => BrowserRecognition;

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const host = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };

  return host.SpeechRecognition || host.webkitSpeechRecognition || null;
}

function errorMessage(code: string | undefined): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "需要麦克风权限，请在浏览器设置里开启";
    case "no-speech":
      return "没有检测到语音，请按住按钮再说一次";
    case "network":
      return "语音识别网络异常，请检查网络后重试";
    case "audio-capture":
      return "无法使用麦克风，请检查设备后重试";
    case "language-not-supported":
      return "当前浏览器不支持英语语音识别";
    default:
      return "语音识别失败，请改用文字输入";
  }
}

function isFatalSpeechError(code: string | undefined): boolean {
  return (
    code === "not-allowed" ||
    code === "service-not-allowed" ||
    code === "network" ||
    code === "audio-capture" ||
    code === "language-not-supported"
  );
}

function normalizeTranscript(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

type UseSpeechRecognitionOptions = {
  /** 松开按钮且识别结束后，把最终文字交给调用方。不保存音频。 */
  onFinal?: (transcript: string) => void;
};

/**
 * 浏览器 Web Speech API 的按住说话封装。
 * 只产生文字，不保存原始音频。
 */
export function useSpeechRecognition(options?: UseSpeechRecognitionOptions) {
  const onFinalRef = useRef(options?.onFinal);
  onFinalRef.current = options?.onFinal;

  const [isSupported, setIsSupported] = useState(false);
  const [supportChecked, setSupportChecked] = useState(false);
  const [phase, setPhase] = useState<SpeechPhase>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const holdingRef = useRef(false);
  const fatalRef = useRef(false);
  const disposedRef = useRef(false);
  const committedRef = useRef("");
  const instanceFinalRef = useRef("");
  const deliveredRef = useRef(false);

  const deliverFinal = useCallback(() => {
    if (deliveredRef.current || fatalRef.current || disposedRef.current) {
      return;
    }
    const text = committedRef.current;
    if (!text) {
      return;
    }
    deliveredRef.current = true;
    onFinalRef.current?.(text);
  }, []);

  const publishTranscript = useCallback((finalText: string, interim: string) => {
    setTranscript(normalizeTranscript(`${finalText}${interim}`));
  }, []);

  const beginRecognition = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition || !holdingRef.current || fatalRef.current || disposedRef.current) {
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      if (disposedRef.current || fatalRef.current || !holdingRef.current) {
        return;
      }
      setError("");
      setPhase((current) => (current === "recognizing" ? current : "listening"));
    };

    recognition.onresult = (event) => {
      let instanceFinal = "";
      let interim = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const piece = result?.[0]?.transcript ?? "";
        if (result?.isFinal) {
          instanceFinal += piece;
        } else {
          interim += piece;
        }
      }

      instanceFinalRef.current = instanceFinal;
      publishTranscript(`${committedRef.current}${instanceFinal}`, interim);
      if (interim.trim() || instanceFinal.trim()) {
        setPhase("recognizing");
      }
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === "aborted" || disposedRef.current) {
        return;
      }

      // 按住期间的短暂停顿会触发 no-speech，继续听即可。
      if (code === "no-speech" && holdingRef.current) {
        return;
      }

      if (isFatalSpeechError(code)) {
        fatalRef.current = true;
        holdingRef.current = false;
      }

      setError(errorMessage(code));
      setPhase("error");
    };

    recognition.onend = () => {
      committedRef.current = normalizeTranscript(
        `${committedRef.current} ${instanceFinalRef.current}`
      );
      instanceFinalRef.current = "";
      setTranscript(committedRef.current);

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      if (disposedRef.current) {
        return;
      }

      // continuous=false 时，浏览器会在一句结束后自动停止。
      // 按钮仍按住则重新开始，直到用户松开。
      if (holdingRef.current && !fatalRef.current) {
        beginRecognition();
        return;
      }

      if (!fatalRef.current) {
        setPhase((current) => (current === "error" ? current : "idle"));
        deliverFinal();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      fatalRef.current = true;
      holdingRef.current = false;
      setError("无法开始语音识别，请重试");
      setPhase("error");
    }
  }, [deliverFinal, publishTranscript]);

  useEffect(() => {
    disposedRef.current = false;
    setIsSupported(Boolean(getRecognitionConstructor()));
    setSupportChecked(true);

    return () => {
      disposedRef.current = true;
      holdingRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (holdingRef.current) {
      return;
    }

    if (!getRecognitionConstructor()) {
      setIsSupported(false);
      setSupportChecked(true);
      setError("当前浏览器不支持语音输入，请用 Chrome 或 Edge");
      setPhase("error");
      return;
    }

    recognitionRef.current?.abort();
    recognitionRef.current = null;
    holdingRef.current = true;
    fatalRef.current = false;
    deliveredRef.current = false;
    committedRef.current = "";
    instanceFinalRef.current = "";
    setTranscript("");
    setError("");
    setPhase("requesting");
    beginRecognition();
  }, [beginRecognition]);

  const stop = useCallback(() => {
    holdingRef.current = false;
    const recognition = recognitionRef.current;

    if (!recognition) {
      if (!fatalRef.current) {
        setPhase((current) => (current === "error" ? current : "idle"));
        deliverFinal();
      }
      return;
    }

    try {
      recognition.stop();
    } catch {
      recognition.abort();
    }
  }, [deliverFinal]);

  const isListening =
    phase === "requesting" || phase === "listening" || phase === "recognizing";

  return {
    isSupported,
    supportChecked,
    isListening,
    phase,
    transcript,
    error,
    start,
    stop,
  };
}
