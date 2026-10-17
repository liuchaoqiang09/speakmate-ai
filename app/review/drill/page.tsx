"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { MicButton, SpeechStatusLine } from "@/src/components/practice/MicButton";
import { AppHeader } from "@/src/components/shell/AppHeader";
import { WaitHint } from "@/src/components/shell/WaitHint";
import { useSpeechRecognition } from "@/src/lib/speech/useSpeechRecognition";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function overlap(left: string, right: string): number {
  const expected = new Set(normalize(right).split(" ").filter(Boolean));
  const spoken = normalize(left).split(" ").filter(Boolean);
  if (expected.size === 0 || spoken.length === 0) {
    return 0;
  }
  const hit = spoken.filter((word) => expected.has(word)).length;
  return Math.round((hit / expected.size) * 100);
}

function DrillContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewId = searchParams.get("id")?.trim() || "";
  const prompt = searchParams.get("prompt")?.trim() || "";
  const expected = searchParams.get("expected")?.trim() || "";
  const [spoken, setSpoken] = useState("");
  const [saving, setSaving] = useState(false);

  const speech = useSpeechRecognition({
    onFinal: (text) => {
      setSpoken(text);
    },
  });

  const score = useMemo(() => (spoken ? overlap(spoken, expected) : null), [spoken, expected]);

  async function markDone() {
    if (!reviewId) {
      router.push("/review");
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/v1/review/${reviewId}/complete`, { method: "POST" });
    } catch {
      // 标记失败也允许返回列表
    }
    router.push("/review");
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE]">
      <AppHeader />
    <main className="mx-auto flex w-full max-w-xl flex-col px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.22em] text-[#0E7C66]">DRILL</p>
      <h1 className="mt-3 text-[32px] font-semibold tracking-tight">Repeat the upgrade</h1>
      <p className="mt-2 text-sm text-[#8A847C]">先看正确说法，再开口跟一遍</p>

      <section className="ink-card mt-8 p-5">
        <p className="text-xs text-[#8A8A8A]">你原来的句子</p>
        <p className="mt-2 text-sm text-[#6F6F6F]">{prompt || "（来自总结纠错）"}</p>
        <p className="mt-4 text-xs text-[#8A8A8A]">请尽量说成</p>
        <p className="mt-2 text-lg font-semibold leading-7">{expected || "请从总结页进入"}</p>
      </section>

      <div className="mt-6">
        <SpeechStatusLine phase={speech.phase} transcript={speech.transcript} error={speech.error} />
        <div className="flex items-center gap-3">
          <MicButton
            disabled={!expected}
            supported={speech.isSupported}
            supportChecked={speech.supportChecked}
            listening={speech.isListening}
            onStart={speech.start}
            onStop={speech.stop}
          />
          <p className="text-sm text-[#6F6A63]">按住说英语</p>
        </div>
      </div>

      {spoken ? (
        <section className="ink-card mt-6 p-5">
          <p className="text-xs text-[#8A8A8A]">你刚才说的</p>
          <p className="mt-2 text-sm leading-6">{spoken}</p>
          {score !== null ? (
            <p className="mt-3 text-sm font-medium text-[#0E7C66]">关键词覆盖约 {score}%</p>
          ) : null}
        </section>
      ) : null}

      <button type="button" className="ink-btn mt-8" disabled={saving} onClick={() => void markDone()}>
        {saving ? "Saving" : "Mark as practiced"}
      </button>
      <Link href="/review" className="ink-btn-line mt-3">
        Back to review
      </Link>
    </main>
    </div>
  );
}

export default function ReviewDrillPage() {
  return (
    <Suspense fallback={<WaitHint title="正在打开跟读" detail="先看正确说法，再开口跟一遍。" />}>
      <DrillContent />
    </Suspense>
  );
}
