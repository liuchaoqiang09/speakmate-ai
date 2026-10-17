"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { AudioPlayer } from "@/src/components/listening/AudioPlayer";
import { AppHeader } from "@/src/components/shell/AppHeader";
import { WaitHint } from "@/src/components/shell/WaitHint";
import { DualCaption } from "@/src/components/summary/DualCaption";

type Question = {
  id: string;
  type: "choice" | "gap" | "true_false" | "matching";
  prompt: string;
  promptZh: string;
  options?: string[];
};

type PublicContent = {
  title: string;
  titleZh: string;
  instructions?: string;
  instructionsZh?: string;
  script?: string;
  scriptZh?: string;
  questions: Question[];
  format?: string;
  examLabel?: string;
  playOnce?: boolean;
  voiceLang?: "en-GB" | "en-US";
  defaultRate?: number;
  retryFrom?: string;
  compacted?: boolean;
};

type ResultDetail = {
  id: string;
  given: string;
  answer: string;
  correct: boolean;
  explanation: string;
  explanationZh: string;
};

type ResultPayload = {
  correctCount: number;
  total: number;
  details: ResultDetail[];
  adviceZh?: string;
};

type SessionPayload = {
  id: string;
  topic: string;
  difficulty: string;
  status: string;
  publicContent: PublicContent;
  result?: ResultPayload | null;
};

function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.trim() || "";
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("缺少练习编号");
      return;
    }

    async function load() {
      try {
        const response = await fetch(`/api/v1/listening/${id}`);
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const result = (await response.json()) as { success?: boolean; data?: SessionPayload; error?: string };
        if (!result.success || !result.data) {
          setError(result.error || "无法加载听力");
          return;
        }
        setSession(result.data);
      } catch {
        setError("网络错误，无法加载听力");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session || submitting) {
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/listening/${session.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = (await response.json()) as { success?: boolean; data?: SessionPayload; error?: string };
      if (!result.success || !result.data) {
        setError(result.error || "提交失败");
        return;
      }
      setSession(result.data);
    } catch {
      setError("网络错误，提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <WaitHint title="正在打开听力" detail="题目马上出现。先听完整段，原文提交后才显示。" />;
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-[#F6F3EE]">
        <AppHeader />
      <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6">
        <p className="ink-alert" role="alert">
          {error}
        </p>
        <Link href="/listening" className="ink-btn-line mt-6">
          返回听力设置
        </Link>
      </main>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const content = session.publicContent;
  const submitted = session.status === "submitted";
  const mockExam = Boolean(content.playOnce);
  const result = session.result;
  const details = new Map((result?.details || []).map((item) => [item.id, item]));

  return (
    <div className="min-h-screen bg-[#F6F3EE]">
      <AppHeader />
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.22em] text-[#0E7C66]">LISTEN</p>
      <h1 className="mt-3 text-[32px] font-semibold tracking-tight">
        {mockExam ? content.title || content.examLabel || "Listening" : content.titleZh || "听力训练"}
      </h1>
      {mockExam ? null : <p className="mt-1 text-sm text-[#8A847C]">{content.title}</p>}
      <p className="mt-2 text-sm text-[#6F6A63]">
        {content.retryFrom
          ? "重听错过的题"
          : content.examLabel || `${session.difficulty} · 先听后做题`}
      </p>
      {content.compacted ? (
        <p className="mt-3 rounded-2xl bg-[#F7F7F5] p-4 text-sm leading-6 text-[#6F6A63]">
          听力原文已按保留策略清理（满 5 天）。分数还在，如需再听请开新的一段。
        </p>
      ) : null}
      {content.instructions || (!mockExam && content.instructionsZh) ? (
        <p className="mt-3 rounded-2xl bg-[#F7F7F5] p-4 text-sm leading-6 text-[#6F6A63]">
          {content.instructions}
          {!mockExam && content.instructionsZh ? (
            <span className="mt-1 block text-[#8A847C]">{content.instructionsZh}</span>
          ) : null}
        </p>
      ) : null}

      {!content.compacted ? (
        <div className="mt-6">
          <AudioPlayer
            text={content.script || ""}
            playOnce={Boolean(content.playOnce)}
            defaultRate={content.defaultRate}
            voiceLang={content.voiceLang}
          />
        </div>
      ) : null}

      <form className="mt-8 flex flex-col gap-5" onSubmit={(event) => void handleSubmit(event)}>
        {(content.questions || []).map((question, index) => {
          const detail = details.get(question.id);
          return (
            <article key={question.id} className="ink-card p-5">
              <p className="text-xs text-[#8A8A8A]">Question {index + 1}</p>
              <p className="mt-2 font-medium">{question.prompt}</p>
              {mockExam ? null : <p className="mt-1 text-sm text-[#8A847C]">{question.promptZh}</p>}

              {question.type === "choice" || question.type === "matching" ? (
                <div className="mt-4 flex flex-col gap-2">
                  {(question.options || []).map((option) => (
                    <label key={option} className="flex items-center gap-3 text-sm">
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        disabled={submitted}
                        checked={answers[question.id] === option}
                        onChange={(event) =>
                          setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              {question.type === "true_false" ? (
                <div className="mt-4 flex gap-4 text-sm">
                  {["True", "False"].map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        disabled={submitted}
                        checked={answers[question.id] === option}
                        onChange={(event) =>
                          setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                        }
                      />
                      {mockExam ? option : option === "True" ? "对" : "错"}
                    </label>
                  ))}
                </div>
              ) : null}

              {question.type === "gap" ? (
                <input
                  className="ink-input mt-4"
                  disabled={submitted}
                  placeholder="NO MORE THAN TWO WORDS AND/OR A NUMBER"
                  value={answers[question.id] || ""}
                  onChange={(event) =>
                    setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                  }
                />
              ) : null}

              {detail ? (
                <div className="mt-4 rounded-2xl bg-[#F7F7F5] p-3 text-sm">
                  <p className={detail.correct ? "font-medium text-[#0E7C66]" : "font-medium text-[#B42318]"}>
                    {detail.correct ? "正确" : "不正确"} · 答案 {detail.answer}
                  </p>
                  <div className="mt-2">
                    <DualCaption english={detail.explanation} chinese={detail.explanationZh} />
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {error ? (
          <p className="ink-alert" role="alert">
            {error}
          </p>
        ) : null}

        {!submitted && !content.compacted ? (
          <button type="submit" className="ink-btn" disabled={submitting}>
            {submitting ? "正在判分..." : "提交答案"}
          </button>
        ) : (
          <section className="ink-card p-5">
            <h2 className="text-lg font-semibold">
              {result?.correctCount}/{result?.total} 题听对
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6F6A63]">{result?.adviceZh}</p>
            {content.compacted ? (
              <p className="mt-4 text-sm text-[#8A847C]">原文已清理，分数仍保留到 30 天。</p>
            ) : (
              <>
                <p className="mt-4 text-xs text-[#8A8A8A]">听力原文</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{content.script}</p>
                <p className="mt-3 text-sm leading-7 text-[#6F6F6F]">{content.scriptZh}</p>
              </>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/listening" className="ink-btn flex-1">
                再听一段
              </Link>
              {!content.compacted && (result?.details || []).some((item) => !item.correct) ? (
                <Link href="/listening/wrong" className="ink-btn-line flex-1">
                  重听错过的题
                </Link>
              ) : (
                <Link href="/listening/history" className="ink-btn-line flex-1">
                  听力记录
                </Link>
              )}
            </div>
            <Link href="/" className="mt-3 inline-flex text-sm font-medium text-[#0E7C66]">
              回首页
            </Link>
          </section>
        )}
      </form>
    </main>
    </div>
  );
}

export default function ListeningPracticePage() {
  return (
    <Suspense fallback={<WaitHint title="正在打开听力" detail="题目和音频马上出来。" />}>
      <PracticeContent />
    </Suspense>
  );
}
