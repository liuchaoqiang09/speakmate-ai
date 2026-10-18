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
import { examPartLabel } from "@/src/lib/exam/labels";
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

type SummaryRecord = {
  sessionId: string;
  strengths: unknown;
  keyErrors: unknown;
  usefulPhrases: unknown;
  nextPracticeFocus: unknown;
  dataConfidence: string | null;
  referenceScore?: unknown;
  topic?: string | null;
  difficulty?: string | null;
  durationSeconds?: number | null;
  turnCount?: number | null;
};

type SummaryPayload = {
  summary: SummaryRecord;
  feedback: unknown;
};

function examAgainHref(exam: string, part: string, nextFocus: string[]): string {
  const params = new URLSearchParams();
  if (exam) {
    params.set("exam", exam);
  }
  if (part) {
    params.set("part", part);
  }
  params.set("mode", "practice");
  if (nextFocus[0]) {
    params.set("focus", nextFocus.slice(0, 2).join(" · "));
  }
  return `/exam/voice?${params.toString()}`;
}

function studyNotes(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as { modelAnswer?: unknown; bandNote?: unknown };
  const modelAnswer = typeof record.modelAnswer === "string" ? record.modelAnswer.trim() : "";
  const bandNote = typeof record.bandNote === "string" ? record.bandNote.trim() : "";
  if (!modelAnswer && !bandNote) {
    return null;
  }
  return (
    <section className="ink-card mt-6 p-5">
      <h2 className="text-lg font-semibold">Stronger sample <span className="text-sm font-normal text-[#8A8176]">更高一档示范</span></h2>
      {bandNote ? (
        <div className="mt-3">
          <DualCaption english={bandNote} englishClassName="text-sm leading-6 text-[#6E675E]" />
        </div>
      ) : null}
      {modelAnswer ? (
        <div className="mt-3">
          <p className="text-xs text-[#8A8176]">示范回答</p>
          <DualCaption english={modelAnswer} englishClassName="text-sm leading-7" />
        </div>
      ) : null}
    </section>
  );
}

function bandSketch(level: number): string {
  if (level >= 7) {
    return "A 7 stays on topic, links ideas, and uses some longer sentences with only occasional slips.";
  }
  if (level >= 6) {
    return "A 6 is long enough, but ideas repeat and correct sentences sit next to incorrect ones.";
  }
  if (level >= 5) {
    return "A 5 keeps going with short ideas, a small set of words, and frequent grammar slips.";
  }
  return "Below 5, speech pauses often and stays on very simple sentences.";
}

function BandSketch({ score }: { score: IeltsReference | ToeflReference }) {
  const level = score.kind === "ielts" ? score.overall : score.taskScore;
  const weakest =
    score.kind === "ielts"
      ? (
          [
            ["Fluency and coherence", score.fluencyCoherence],
            ["Lexical resource", score.lexicalResource],
            ["Grammatical range and accuracy", score.grammaticalRange],
          ] as Array<[string, number]>
        ).sort((left, right) => left[1] - right[1])[0]
      : null;
  return (
    <section className="ink-card mt-6 p-5">
      <h2 className="text-lg font-semibold">This level <span className="text-sm font-normal text-[#8A8176]">这一档通常怎样</span></h2>
      <div className="mt-3">
        <DualCaption english={bandSketch(level)} />
      </div>
      {weakest ? (
        <div className="mt-3">
          <DualCaption
            english={`Lowest area · ${weakest[0]} ${Number(weakest[1]).toFixed(1)}. ${bandSketch(Number(weakest[1]))}`}
            englishClassName="text-sm leading-6 text-[#6E675E]"
          />
        </div>
      ) : null}
    </section>
  );
}

type IeltsReference = {
  kind: "ielts";
  overall: number;
  fluencyCoherence: number;
  lexicalResource: number;
  grammaticalRange: number;
  fluencyComment: string;
  lexicalComment: string;
  grammarComment: string;
};

type ToeflReference = {
  kind: "toefl_repeat" | "toefl_interview";
  taskScore: number;
  comment: string;
  topicComment: string;
  paceComment: string;
  languageComment: string;
};

function readScore(value: unknown): IeltsReference | ToeflReference | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.kind === "ielts" && typeof record.overall === "number") {
    return {
      kind: "ielts",
      overall: record.overall,
      fluencyCoherence: Number(record.fluencyCoherence),
      lexicalResource: Number(record.lexicalResource),
      grammaticalRange: Number(record.grammaticalRange),
      fluencyComment: typeof record.fluencyComment === "string" ? record.fluencyComment : "",
      lexicalComment: typeof record.lexicalComment === "string" ? record.lexicalComment : "",
      grammarComment: typeof record.grammarComment === "string" ? record.grammarComment : "",
    };
  }
  if (
    (record.kind === "toefl_repeat" || record.kind === "toefl_interview") &&
    typeof record.taskScore === "number"
  ) {
    return {
      kind: record.kind,
      taskScore: record.taskScore,
      comment: typeof record.comment === "string" ? record.comment : "",
      topicComment: typeof record.topicComment === "string" ? record.topicComment : "",
      paceComment: typeof record.paceComment === "string" ? record.paceComment : "",
      languageComment: typeof record.languageComment === "string" ? record.languageComment : "",
    };
  }
  return null;
}

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId")?.trim() || "";
  const exam = searchParams.get("exam")?.trim().toLowerCase() || "";
  const part = searchParams.get("part")?.trim().toLowerCase() || "";
  const partLabel = examPartLabel(exam, part);
  const pageTitle = partLabel ? `${partLabel} 练习总结` : "考试口语练习总结";

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
          <h1 className="text-[32px] font-semibold tracking-tight">{pageTitle}</h1>
          <p className="ink-alert mt-6" role="alert">
            {error || "无法显示总结"}
          </p>
          <Link href="/exam" className="ink-btn-line mt-8">
            返回考试设置
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
  const reference = readScore(summary.referenceScore);
  const hasMeta =
    partLabel ||
    summary.difficulty ||
    typeof summary.durationSeconds === "number" ||
    typeof summary.turnCount === "number";

  return (
    <div className="min-h-screen ">
      <AppHeader />
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <p className="text-center text-xs font-medium tracking-[0.28em] text-[#8A8176]">SUMMARY</p>
      <h1 className="mt-3 text-center text-[32px] font-semibold tracking-tight">{pageTitle}</h1>
      <p className="mt-2 text-center text-sm text-[#8A8176]">本次总结</p>
      <p className="mt-3 text-center text-sm text-[#6E675E]">参考分，不含口音，不是官方成绩</p>

      {insufficient ? (
        <p className="mt-8 rounded-2xl border border-[#1F3D36] bg-white px-4 py-3 text-sm" role="status">
          数据不足，本次练习太短，无法生成完整反馈
        </p>
      ) : null}

      {hasMeta ? (
        <section className="mt-8 grid grid-cols-2 gap-3">
          {partLabel ? (
            <article className="ink-card p-4">
              <p className="text-xs text-[#8A8176]">题型</p>
              <p className="mt-2 text-lg font-semibold">{partLabel}</p>
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

      {studyNotes(summary.referenceScore)}
      {reference ? <BandSketch score={reference} /> : null}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href={examAgainHref(exam, part, nextFocusEn)} className="ink-btn flex-1">
          Practice this focus
        </Link>
        <Link href="/exam" className="ink-btn-line flex-1">
          再练口语
        </Link>
      </div>
      <Link href="/review" className="ink-btn-line mt-3">
        Review wrong sentences · 错句再开口
      </Link>
      <Link href="/history" className="mt-3 text-center text-sm font-medium text-[#1F3D36]">
        Practice history · 练习历史
      </Link>
    </main>
    </div>
  );
}

export default function ExamSummaryPage() {
  return (
    <Suspense fallback={<WaitHint title="正在加载总结" detail="分数和纠错马上出来，大约十几秒。" />}>
      <SummaryContent />
    </Suspense>
  );
}
