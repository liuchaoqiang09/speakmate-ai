"use client";

import { useEffect, useRef, useState } from "react";

type AudioPlayerProps = {
  text: string;
  disabled?: boolean;
  playOnce?: boolean;
  defaultRate?: number;
  voiceLang?: "en-GB" | "en-US";
  hint?: string;
  onPlayedOnce?: () => void;
};

function stripSpeakerLabels(text: string): string {
  return text.replace(/^(M|W|A|B|N|Q|Man|Woman|Narrator|Professor|Student|Clerk|Tutor|Guide|Customer|Host|Lisa|Tom):\s*/gim, "");
}

export function AudioPlayer({
  text,
  disabled = false,
  playOnce = false,
  defaultRate = 0.9,
  voiceLang = "en-US",
  hint,
  onPlayedOnce,
}: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(defaultRate);
  const [plays, setPlays] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const usedUp = playOnce && plays >= 1;

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function pickVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis?.getVoices() || [];
    const want = voiceLang.toLowerCase();
    return (
      voices.find((item) => item.lang.toLowerCase().startsWith(want)) ||
      voices.find((item) => item.lang.toLowerCase().startsWith("en")) ||
      null
    );
  }

  function stop(consume = false) {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setPlaying(false);
    if (consume && playOnce) {
      setPlays(1);
    }
  }

  function play() {
    if (disabled || usedUp || !text.trim() || typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setPlaying(false);
    const utterance = new SpeechSynthesisUtterance(stripSpeakerLabels(text));
    const voice = pickVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = voiceLang;
    utterance.rate = playOnce ? defaultRate : rate;
    utterance.onend = () => {
      setPlaying(false);
      setPlays((current) => {
        if (current < 1) {
          onPlayedOnce?.();
        }
        return current + 1;
      });
    };
    utterance.onerror = () => {
      setPlaying(false);
      if (playOnce) {
        setPlays(1);
        onPlayedOnce?.();
      }
    };
    utteranceRef.current = utterance;
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="rounded-2xl border border-[#E4D9C8] bg-[#F7F1E7] p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#1F3D36]">AUDIO</p>
      <p className="mt-2 text-sm text-[#6E675E]">
        {hint ||
          (playOnce
            ? "The recording is played once only. You may look at the questions while you listen."
            : "先听完整段，再去做题。答题前不显示原文。")}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="ink-btn h-12 px-5 text-sm" disabled={disabled || usedUp} onClick={play}>
          {playOnce
            ? playing
              ? "Playing..."
              : usedUp
                ? "Played once"
                : "Play"
            : playing
              ? "播放中..."
              : usedUp
                ? "已播放一遍"
                : plays === 0
                  ? "播放听力"
                  : "再听一遍"}
        </button>
        <button type="button" className="ink-btn-line h-12 px-5 text-sm" disabled={!playing} onClick={() => stop(playOnce)}>
          {playOnce ? "Stop" : "停止"}
        </button>
      </div>
      {playOnce ? (
        <p className="mt-3 text-xs text-[#8A8176]">
          Exam speed locked · Played {plays}/1 · Use Chrome or Edge with system sound on
        </p>
      ) : (
        <>
          <fieldset className="mt-4">
            <legend className="text-xs text-[#8A8176]">语速</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { value: 0.75, label: "慢" },
                { value: 0.9, label: "常速" },
                { value: 1.1, label: "稍快" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="ink-chip"
                  aria-pressed={rate === item.value}
                  onClick={() => setRate(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="mt-3 text-xs text-[#8A8176]">已播放 {plays} 次 · 请用 Chrome 或 Edge，并打开系统声音</p>
        </>
      )}
    </div>
  );
}
