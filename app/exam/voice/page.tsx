"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/src/components/shell/AppHeader";
import { WaitHint } from "@/src/components/shell/WaitHint";
import { VoiceRoom, type VoiceRoomHandle } from "@/src/components/voice/VoiceRoom";
import { finishPracticeSession } from "@/src/lib/practice/finishSession";
import { buildCoachNote } from "@/src/lib/general/coachNote";
import { EXAM_CHOICES, buildExamTask, normalizeExamPart } from "@/src/lib/exam/tasks";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type SessionPayload = {
  session: { id: string };
};

type SessionCreateResult =
  | { sessionId: string }
  | { error: string }
  | { unauthorized: true };

const sessionCreates = new Map<string, Promise<SessionCreateResult>>();

function shareSessionCreate(
  key: string,
  create: () => Promise<SessionCreateResult>
): Promise<SessionCreateResult> {
  const existing = sessionCreates.get(key);
  if (existing) {
    return existing;
  }

  let settled = false;
  const promise = new Promise<SessionCreateResult>((resolve) => {
    const timer = window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      if (sessionCreates.get(key) === promise) {
        sessionCreates.delete(key);
      }
      resolve({ error: "创建练习超时，请重试" });
    }, 10_000);

    create()
      .then((value) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        resolve({ error: "网络错误，无法创建练习" });
      });
  }).finally(() => {
    if (sessionCreates.get(key) === promise) {
      sessionCreates.delete(key);
    }
  });

  sessionCreates.set(key, promise);
  return promise;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function ExamVoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedExam = searchParams.get("exam")?.trim().toLowerCase() || "ielts";
  const requestedPart = searchParams.get("part")?.trim().toLowerCase() || "part1";
  const practiceMode = searchParams.get("mode")?.trim() === "practice";
  const focus = searchParams.get("focus") || "";
  const normalized = normalizeExamPart(requestedExam, requestedPart) || {
    exam: "ielts" as const,
    part: "part1" as const,
  };

  const [sessionId, setSessionId] = useState("");
  const [pageError, setPageError] = useState("");
  const [creating, setCreating] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [clockSeconds, setClockSeconds] = useState<number | null>(null);
  const [clockLabel, setClockLabel] = useState("");
  const [repeatCount, setRepeatCount] = useState(0);
  const [answerCount, setAnswerCount] = useState(0);
  const roomRef = useRef<VoiceRoomHandle | null>(null);
  const clockPhase = useRef<"prep" | "speak" | "run" | "part1" | "part3" | "repeat" | "interview">("run");
  const partKey = `${normalized.exam}:${normalized.part}:${practiceMode ? "practice" : "simulation"}`;

  const script = useMemo(
    () => buildExamTask(normalized.exam, normalized.part, sessionId || "preview"),
    [normalized.exam, normalized.part, sessionId]
  );

  useEffect(() => {
    let active = true;
    setCreating(true);
    setSessionId("");
    setPageError("");
    setClockSeconds(null);
    setClockLabel("");
    setRepeatCount(0);
    setAnswerCount(0);
    clockPhase.current = "run";
    void roomRef.current?.leave();

    const pending = shareSessionCreate(partKey, async () => {
      try {
        const response = await fetch("/api/v1/practice-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "exam",
            examType: normalized.exam,
            topic: normalized.part,
            difficulty: "中级",
            feedbackMode: practiceMode ? "each" : "deferred",
            coachNote: practiceMode
              ? [
                  buildCoachNote(focus, ""),
                  "PRACTICE MODE: if the learner is stuck, give one short English prompt. Keep answers structured: point, reason, example.",
                ]
                  .filter(Boolean)
                  .join(" ")
              : buildCoachNote(focus, ""),
          }),
        });

        if (response.status === 401) {
          return { unauthorized: true };
        }

        const result = (await response.json()) as ApiResponse<SessionPayload>;
        if (!result.success || !result.data?.session.id) {
          return { error: result.error || "创建练习失败" };
        }

        return { sessionId: result.data.session.id };
      } catch {
        return { error: "网络错误，无法创建练习" };
      }
    });

    void pending.then((outcome) => {
      if (!active) {
        return;
      }
      if ("unauthorized" in outcome) {
        router.replace("/login");
        return;
      }
      if ("error" in outcome) {
        setPageError(outcome.error);
        setCreating(false);
        return;
      }
      setSessionId(outcome.sessionId);
      setCreating(false);
    });

    return () => {
      active = false;
    };
  }, [focus, normalized.exam, normalized.part, partKey, practiceMode, router]);

  useEffect(() => {
    if (clockSeconds === null) {
      return;
    }
    if (clockSeconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setClockSeconds((current) => (current === null ? current : current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [clockSeconds]);

  useEffect(() => {
    if (script?.clock !== "part2" || clockPhase.current !== "prep" || clockSeconds !== 0) {
      return;
    }
    clockPhase.current = "speak";
    setClockLabel("Speak");
    setClockSeconds(120);
  }, [clockSeconds, script?.clock]);

  useEffect(() => {
    if (script?.clock !== "ielts_full" || clockSeconds !== 0) {
      return;
    }
    if (clockPhase.current === "part1") {
      clockPhase.current = "prep";
      setClockLabel("Part 2 prepare");
      setClockSeconds(60);
      return;
    }
    if (clockPhase.current === "prep") {
      clockPhase.current = "speak";
      setClockLabel("Part 2 speak");
      setClockSeconds(120);
      return;
    }
    if (clockPhase.current === "speak") {
      clockPhase.current = "part3";
      setClockLabel("Part 3");
      setClockSeconds(300);
    }
  }, [clockSeconds, script?.clock]);

  function beginClock() {
    if (!script) {
      return;
    }
    setRepeatCount(0);
    setAnswerCount(0);
    if (script.clock === "part2") {
      clockPhase.current = "prep";
      setClockLabel("Prepare");
      setClockSeconds(60);
      return;
    }
    if (script.clock === "ielts_full") {
      clockPhase.current = "part1";
      setClockLabel("Part 1");
      setClockSeconds(300);
      return;
    }
    if (script.clock === "toefl_full") {
      clockPhase.current = "repeat";
      setClockLabel("Listen and repeat");
      setClockSeconds(null);
      return;
    }
    if (script.clock === "part1" || script.clock === "part3") {
      clockPhase.current = "run";
      setClockLabel("Part time");
      setClockSeconds(300);
      return;
    }
    if (script.clock === "interview") {
      clockPhase.current = "run";
      setClockLabel("This answer");
      setClockSeconds(45);
      return;
    }
    clockPhase.current = "run";
    setClockLabel("Repeat");
    setClockSeconds(null);
  }

  function handleCaption(caption: { role: "user" | "assistant" }) {
    if (!script) {
      return;
    }
    if ((script.clock === "repeat" || script.clock === "toefl_full") && caption.role === "user" && clockPhase.current !== "interview") {
      setRepeatCount((current) => {
        const next = Math.min(7, current + 1);
        if (script.clock === "toefl_full" && next >= 7) {
          clockPhase.current = "interview";
          setClockLabel("Interview");
          setClockSeconds(45);
        }
        return next;
      });
    }
    if (script.clock === "toefl_full" && caption.role === "assistant" && clockPhase.current === "interview") {
      setClockLabel("This answer");
      setClockSeconds(45);
    }
    if (script.clock === "toefl_full" && caption.role === "user" && clockPhase.current === "interview") {
      setAnswerCount((current) => Math.min(4, current + 1));
    }
    if (script.clock === "interview" && caption.role === "assistant") {
      setClockLabel("This answer");
      setClockSeconds(45);
    }
    if (script.clock === "interview" && caption.role === "user") {
      setAnswerCount((current) => Math.min(4, current + 1));
    }
  }

  function openPart(exam: string, part: string) {
    if (finishing || (exam === normalized.exam && part === normalized.part)) {
      return;
    }
    void roomRef.current?.leave();
    const params = new URLSearchParams({
      exam,
      part,
      mode: practiceMode ? "practice" : "simulation",
    });
    router.replace(`/exam/voice?${params.toString()}`);
  }

  async function handleLeave() {
    if (finishing) {
      return;
    }
    if (!window.confirm("退出将立刻结束通话，本轮可以稍后再从历史查看。")) {
      return;
    }
    setFinishing(true);
    await roomRef.current?.leave();
    router.push("/exam");
  }

  async function endNow() {
    if (finishing) {
      return;
    }

    setFinishing(true);
    await roomRef.current?.leave();

    if (!sessionId) {
      router.push("/exam");
      return;
    }

    const result = await finishPracticeSession(sessionId);
    if (result.unauthorized) {
      router.replace("/login");
      return;
    }

    const params = new URLSearchParams({
      sessionId,
      exam: normalized.exam,
      part: normalized.part,
    });
    router.push(`/exam/summary?${params.toString()}`);
  }

  async function handleFinish() {
    if (!window.confirm("结束本轮并查看总结？语音会立刻关掉。")) {
      return;
    }
    await endNow();
  }

  if (creating || !script) {
    return <WaitHint title="正在准备模拟口语" detail="马上进入考官房间。请先允许麦克风。" />;
  }

  if (pageError || !sessionId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl text-center">
          <h1 className="text-[32px] font-semibold tracking-tight">{script.heading}</h1>
          <p className="ink-alert mt-6" role="alert">
            {pageError || "无法开始语音练习"}
          </p>
          <Link href="/exam" className="ink-btn-line mt-8">
            Exam setup
          </Link>
        </div>
      </main>
    );
  }

  const clockDone = clockSeconds === 0 && script.clock !== "part2";
  const part2SpeakDone = script.clock === "part2" && clockPhase.current === "speak" && clockSeconds === 0;

  return (
    <div className="min-h-screen ">
      <AppHeader />
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col px-4 py-4 sm:px-6">
      <header className="flex items-start justify-between gap-4 px-1 py-2">
        <div>
          <p className="text-sm text-[#6E675E]">
            {practiceMode ? "Practice · 练习模式可看提示" : "Mock speaking · 模拟口语"}
          </p>
          <h1 className="mt-1 text-[32px] font-semibold tracking-tight">{script.heading}</h1>
          <p className="mt-1 text-sm text-[#8A8176]">{script.headingZh}</p>
          <p className="mt-2 text-sm text-[#6E675E]">{script.limit}</p>
          <p className="mt-1 text-sm text-[#8A8176]">{script.limitZh}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleLeave()}
          disabled={finishing}
          className="ink-btn-line shrink-0 px-4 text-sm"
        >
          Leave
          <span className="text-sm font-normal text-[#8A8176]">退出</span>
        </button>
      </header>

      {normalized.part === "full" ? (
        <p className="mt-4 text-sm text-[#6E675E]">
          {normalized.exam === "ielts"
            ? "整场口语：Part 1、Part 2、Part 3 一次完成。Part 3 接着 Part 2 的题卡。"
            : "整场口语：先听后复述 7 句，再完成 4 个访谈问题。"}
        </p>
      ) : (
      <div className="mt-4 flex flex-wrap gap-2">
        {EXAM_CHOICES.map((choice) => {
          const selected = choice.exam === normalized.exam && choice.part === normalized.part;
          return (
            <button
              key={`${choice.exam}-${choice.part}`}
              type="button"
              aria-pressed={selected}
              className="ink-chip"
              onClick={() => openPart(choice.exam, choice.part)}
            >
              {choice.exam === "ielts" ? "IELTS" : "TOEFL"} {choice.label}
            </button>
          );
        })}
      </div>
      )}

      <section className="ink-card mt-4 p-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#1F3D36]">EXAMINER</p>
        <p className="mt-2 text-sm leading-6 text-[#1C1712]">{script.announcement}</p>
      </section>

      {script.clock === "part2" ? (
        <section className="ink-card mt-4 p-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#1F3D36]">STRUCTURE</p>
          <p className="mt-2 text-sm text-[#6E675E]">把话说满：观点 · 原因 · 例子 · 收尾</p>
          <ul className="mt-3 space-y-1 text-sm leading-6">
            <li>Point · 先说你要讲什么</li>
            <li>Reason · 为什么</li>
            <li>Example · 一个具体经历</li>
            <li>Close · 用一句话收尾</li>
          </ul>
        </section>
      ) : null}

      {practiceMode ? (
        <section className="ink-card mt-4 p-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#1F3D36]">HINTS</p>
          <p className="mt-2 text-sm leading-6 text-[#1C1712]">
            卡住时可以说：Let me think. / For example... / The reason is...
          </p>
        </section>
      ) : null}

      {clockSeconds !== null ? (
        <p className="mt-4 text-sm font-medium text-[#16312B]" role="timer">
          {clockLabel} {formatClock(clockSeconds)}
          {clockDone || part2SpeakDone ? " · Time" : ""}
        </p>
      ) : null}
      {script.clock === "repeat" || script.clock === "toefl_full" ? (
        <p className="mt-4 text-sm font-medium text-[#16312B]">Repeat {repeatCount} / 7</p>
      ) : null}
      {script.clock === "interview" || script.clock === "toefl_full" ? (
        <p className="mt-2 text-sm text-[#6E675E]">Answers {answerCount} / 4</p>
      ) : null}

      <div className="mt-4 flex flex-1">
        <VoiceRoom
          onEnded={() => void endNow()}
          ref={roomRef}
          sessionId={sessionId}
          onLive={beginClock}
          onDefiniteCaption={handleCaption}
          deferAssistantText={script.clock === "repeat" || script.clock === "toefl_full"}
        />
      </div>

      <div className="mt-4">
        <button type="button" onClick={() => void handleFinish()} disabled={finishing} className="ink-btn-line w-full">
          {finishing ? "正在结束并写总结..." : "End session · 结束本轮"}
        </button>
      </div>
    </main>
    </div>
  );
}

function ExamVoiceKeyed() {
  const searchParams = useSearchParams();
  const exam = searchParams.get("exam") || "ielts";
  const part = searchParams.get("part") || "part1";
  const mode = searchParams.get("mode") || "simulation";
  return <ExamVoiceContent key={`${exam}:${part}:${mode}`} />;
}

export default function ExamVoicePage() {
  return (
    <Suspense fallback={<WaitHint title="正在准备模拟口语" detail="考官马上进房，请先允许麦克风。" />}>
      <ExamVoiceKeyed />
    </Suspense>
  );
}
