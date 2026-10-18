"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/src/components/shell/AppHeader";
import {
  readCaptionsHiddenPref,
  readVoicePref,
  writeCaptionsHiddenPref,
  writeVoicePref,
} from "@/src/lib/prefs/practicePrefs";
import { SPEAKMATE_VOICES, type SpeakMateVoiceId } from "@/src/lib/volc/voices";

export default function SettingsPage() {
  const [voice, setVoice] = useState<SpeakMateVoiceId>("male");
  const [captionsHidden, setCaptionsHidden] = useState(false);

  useEffect(() => {
    setVoice(readVoicePref());
    setCaptionsHidden(readCaptionsHiddenPref());
  }, []);

  function chooseVoice(next: SpeakMateVoiceId) {
    setVoice(next);
    writeVoicePref(next);
  }

  function toggleCaptions(hidden: boolean) {
    setCaptionsHidden(hidden);
    writeCaptionsHiddenPref(hidden);
  }

  return (
    <div className="min-h-screen ">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-col px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#1F3D36]">SETTINGS</p>
        <h1 className="mt-3 text-[32px] font-semibold tracking-tight">练习设置</h1>
        <p className="mt-2 text-sm text-[#8A8176]">Practice preferences</p>
        <p className="mt-3 text-sm leading-6 text-[#6E675E]">
          音色和字幕会记在这台设备上，下一通语音自动用。账号登录以后再单独调整。
        </p>

        <section className="ink-card mt-8 p-5">
          <h2 className="text-sm font-medium">Partner voice · 伙伴音色</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {(Object.keys(SPEAKMATE_VOICES) as SpeakMateVoiceId[]).map((id) => (
              <button
                key={id}
                type="button"
                className="ink-chip"
                aria-pressed={voice === id}
                onClick={() => chooseVoice(id)}
              >
                {SPEAKMATE_VOICES[id].labelZh}
              </button>
            ))}
          </div>
        </section>

        <section className="ink-card mt-4 p-5">
          <h2 className="text-sm font-medium">Captions · 字幕</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className="ink-chip" aria-pressed={!captionsHidden} onClick={() => toggleCaptions(false)}>
              默认显示
            </button>
            <button type="button" className="ink-chip" aria-pressed={captionsHidden} onClick={() => toggleCaptions(true)}>
              默认隐藏（纯语音）
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
