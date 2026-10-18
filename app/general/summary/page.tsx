"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  KeyErrorsSection,
  LanguageFeedbackSection,
  NextFocusSection,
  PhrasesSection,
  StrengthsSection,
} from "@/src/components/summary/FeedbackSection";
import { AppHeader } from "@/src/components/shell/AppHeader";
import { WaitHint } from "@/src/components/shell/WaitHint";
import { DualCaption } from "@/src/components/summary/DualCaption";
import { SpeakingScorePanel } from "@/src/components/summary/SpeakingScorePanel";
import { generalScene } from "@/src/lib/general/scenes";
import {
  asBilingualFeedback,
  asBilingualNotes,
  asBilingualPhrases,
} from "@/src/lib/summary/bilingual";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type UsefulPhrase = {
  phrase: string;
  meaning_zh: string;
  example: string;
};

type SummaryRecord = {
  sessionId: string;
  strengths: unknown;
  keyErrors: unknown;
  usefulPhrases: unknown;
  nextPracticeFocus: unknown;
  referenceScore?: unknown;
  dataConfidence: string | null;
  topic?: string | null;
  difficulty?: string | null;
  durationSeconds?: number | null;
  turnCount?: number | null;
};

type SummaryPayload = {
  summary: SummaryRecord;
  feedback: unknown;
};

function asStringArray(value: unknown): string[] {
  return asBilingualNotes(value).map((item) => item.en);
}

function goalsMet(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const met = (value as { goalsMet?: unknown }).goalsMet;
  return asStringArray(met);
}

function continueHref(
  kind: "voice" | "practice",
  summary: SummaryRecord,
  nextFocus: string[],
  phrases: UsefulPhrase[]
): string {
  const params = new URLSearchParams();
  if (summary.topic) {
    params.set("topic", summary.topic);
  }
  if (summary.difficulty) {
    params.set("difficulty", summary.difficulty);
  }
  if (nextFocus[0]) {
    params.set("focus", nextFocus.slice(0, 2).join(" · "));
  }
  const phraseText = phrases
    .slice(0, 3)
    .map((item) => item.phrase)
    .join(" | ");
  if (phraseText) {
    params.set("phrases", phraseText);
  }
  const query = params.toString();
  return query ? `/general/${kind}?${query}` : `/general/${kind}`;
}

function GoalCheck({ topic, difficulty, met }: { topic: string; difficulty?: string | null; met: string[] }) {
  const goals = generalScene(topic, difficulty).goals;
  if (goals.length === 0) {
    return null;
  }
  const done = new Set(met.map((item) => item.trim().toLowerCase()));
  return (
    <section className="ink-card mt-6 p-5">
      <h2 className="text-lg font-semibold">Scene goals <span className="text-sm font-normal text-[#8A8176]">场景目标</span></h2>
      <ul className="mt-4 space-y-3 text-sm leading-6">
        {goals.map((goal) => {
          const checked = done.has(goal.trim().toLowerCase());
          return (
            <li key={goal} className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-xs font-medium text-[#1F3D36]">
                {checked ? "Done" : "Open"}
              </span>
              <DualCaption english={goal} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId")?.trim() || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<SummaryPayload | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("缺少练习编号，无法查看总结");
      return;
    }

    async function loadSummary() {
      try {
        let response = await fetch(`/api/v1/practice-sessions/${sessionId}/summary`);
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          response = await fetch(`/api/v1/practice-sessions/${sessionId}/summary`);
        }

        const result = (await response.json()) as ApiResponse<SummaryPayload>;
        if (!result.success || !result.data) {
          setError(result.error || "无法加载总结");
          return;
        }

        setPayload(result.data);
      } catch {
        setError("总结还在生成或网络中断，请稍后从历史记录打开");
      } finally {
        setLoading(false);
      }
    }

    void loadSummary();
  }, [router, sessionId]);

  if (loading) {
    return (
      <WaitHint
        title="正在写本轮总结"
        detail="对照你说的内容生成分数和改错，大约需要几十秒。失败可从练习历史再打开。"
      />
    );
  }

  if (error || !payload) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl text-center">
          <h1 className="text-[32px] font-semibold tracking-tight">练习总结</h1>
          <p className="ink-alert mt-6" role="alert">
            {error || "无法显示总结"}
          </p>
          <Link href="/general" className="ink-btn-line mt-8">
            返回设置页
          </Link>
        </div>
      </main>
    );
  }

  const { summary, feedback: rawFeedback } = payload;
  const insufficient = summary.dataConfidence === "insufficient";
  const strengths = asBilingualNotes(summary.strengths);
  const keyErrors = asBilingualNotes(summary.keyErrors);
  const phrases = asBilingualPhrases(summary.usefulPhrases);
  const nextFocus = asBilingualNotes(summary.nextPracticeFocus);
  const feedback = asBilingualFeedback(rawFeedback);
  const nextFocusEn = nextFocus.map((item) => item.en);
  const hasMeta =
    summary.topic ||
    summary.difficulty ||
    typeof summary.durationSeconds === "number" ||
    typeof summary.turnCount === "number";

  return (
    <div className="min-h-screen ">
      <AppHeader />
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <p className="text-center text-xs font-medium tracking-[0.28em] text-[#8A8176]">SUMMARY</p>
      <h1 className="mt-3 text-center text-[32px] font-semibold tracking-tight">Session notes</h1>
      <p className="mt-2 text-center text-sm text-[#8A8176]">本次总结</p>
      <p className="mt-3 text-center text-sm text-[#6E675E]">学习建议，不是官方分数</p>

      {insufficient ? (
        <p className="mt-8 rounded-2xl border border-[#1F3D36] bg-white px-4 py-3 text-sm text-[#111111]" role="status">
          数据不足，本次练习太短，无法生成完整反馈
        </p>
      ) : null}

      {hasMeta ? (
        <section className="mt-8 grid grid-cols-2 gap-3">
          {summary.topic ? (
            <article className="ink-card p-4">
              <p className="text-xs text-[#8A8176]">主题</p>
              <p className="mt-2 text-lg font-semibold">{summary.topic}</p>
            </article>
          ) : null}
          {summary.difficulty ? (
            <article className="ink-card p-4">
              <p className="text-xs text-[#8A8176]">难度</p>
              <p className="mt-2 text-lg font-semibold">{summary.difficulty}</p>
            </article>
          ) : null}
          {typeof summary.durationSeconds === "number" ? (
            <article className="ink-card p-4">
              <p className="text-xs text-[#8A8176]">时长</p>
              <p className="mt-2 text-lg font-semibold">{summary.durationSeconds} 秒</p>
            </article>
          ) : null}
          {typeof summary.turnCount === "number" ? (
            <article className="ink-card p-4">
              <p className="text-xs text-[#8A8176]">轮次</p>
              <p className="mt-2 text-lg font-semibold">{summary.turnCount}</p>
            </article>
          ) : null}
        </section>
      ) : null}

      <SpeakingScorePanel raw={summary.referenceScore} />

      {!insufficient ? <StrengthsSection items={strengths} /> : null}
      {!insufficient ? <KeyErrorsSection items={keyErrors} /> : null}
      {!insufficient ? <LanguageFeedbackSection items={feedback} /> : null}
      {!insufficient ? <PhrasesSection items={phrases} /> : null}
      {!insufficient ? <NextFocusSection items={nextFocus} /> : null}

      {summary.topic ? <GoalCheck topic={summary.topic} difficulty={summary.difficulty} met={goalsMet(summary.referenceScore)} /> : null}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href={continueHref("voice", summary, nextFocusEn, phrases)} className="ink-btn flex-1">
          Continue this scene
        </Link>
        <Link href={continueHref("practice", summary, nextFocusEn, phrases)} className="ink-btn-line flex-1">
          Continue in text
        </Link>
      </div>
      <Link href="/review" className="ink-btn-line mt-3">
        Review wrong sentences
      </Link>
      <Link href="/history" className="mt-3 text-center text-sm font-medium text-[#1F3D36]">
        Practice history · 练习历史
      </Link>
    </main>
    </div>
  );
}

export default function GeneralSummaryPage() {
  return (
    <Suspense fallback={<WaitHint title="正在加载总结" detail="分数和纠错马上出来，大约十几秒。" />}>
      <SummaryContent />
    </Suspense>
  );
}
