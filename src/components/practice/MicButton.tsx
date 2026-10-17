"use client";

import { useEffect, useRef } from "react";
import type { SpeechPhase } from "@/src/lib/speech/useSpeechRecognition";

type SpeechStatusLineProps = {
  phase: SpeechPhase;
  transcript: string;
  error: string;
};

/** 语音输入状态：空闲不占位，其余状态给用户明确提示 */
export function SpeechStatusLine({
  phase,
  transcript,
  error,
}: SpeechStatusLineProps) {
  if (phase === "error" && error) {
    return (
      <p
        className="ink-alert mb-3"
        role="alert"
      >
        {error}
      </p>
    );
  }

  if (phase === "requesting") {
    return (
      <p className="mb-3 text-sm text-[#6F6F6F]" role="status">
        Asking for the microphone
      </p>
    );
  }

  if (phase === "listening" || phase === "recognizing") {
    return (
      <p className="mb-3 text-sm italic text-[#6F6F6F]" role="status">
        Listening
        {transcript ? <span className="mt-1 block text-[#111111] not-italic">{transcript}</span> : null}
      </p>
    );
  }

  return null;
}

type MicButtonProps = {
  disabled: boolean;
  supported: boolean;
  supportChecked: boolean;
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/** 按住说话按钮：鼠标、触摸和空格键共用同一套开始/结束 */
export function MicButton({
  disabled,
  supported,
  supportChecked,
  listening,
  onStart,
  onStop,
}: MicButtonProps) {
  const pressedRef = useRef(false);
  const unsupported = supportChecked && !supported;
  const blocked = disabled || unsupported;

  function beginPress() {
    if (blocked || pressedRef.current) {
      return;
    }
    pressedRef.current = true;
    onStart();
  }

  function endPress() {
    if (!pressedRef.current) {
      return;
    }
    pressedRef.current = false;
    onStop();
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat) {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (isTypingTarget(event.target) || blocked) {
        return;
      }

      event.preventDefault();
      beginPress();
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code !== "Space" || isTypingTarget(event.target)) {
        return;
      }
      endPress();
    }

    function handleRelease() {
      endPress();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("pointerup", handleRelease);
    window.addEventListener("pointercancel", handleRelease);
    window.addEventListener("mouseup", handleRelease);
    window.addEventListener("touchend", handleRelease);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("pointerup", handleRelease);
      window.removeEventListener("pointercancel", handleRelease);
      window.removeEventListener("mouseup", handleRelease);
      window.removeEventListener("touchend", handleRelease);
    };
  });

  const title = unsupported
    ? "当前浏览器不支持语音输入，请用 Chrome 或 Edge"
    : "Hold to talk, release to send";

  return (
    <button
      type="button"
      aria-label="按住说话"
      aria-pressed={listening}
      title={title}
      disabled={blocked}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        beginPress();
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        endPress();
      }}
      onPointerCancel={endPress}
      onContextMenu={(event) => event.preventDefault()}
      className={
        listening
          ? "ink-btn h-14 shrink-0 touch-none select-none px-4 text-sm"
          : "ink-btn-line h-14 shrink-0 touch-none select-none px-4 text-sm"
      }
    >
      <MicrophoneIcon />
      {listening ? "Listening" : "Hold to talk"}
    </button>
  );
}

function MicrophoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
