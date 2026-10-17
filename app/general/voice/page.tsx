"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { SceneGoals } from "@/src/components/general/SceneGoals";
import { AppHeader } from "@/src/components/shell/AppHeader";
import { WaitHint } from "@/src/components/shell/WaitHint";
import { VoiceRoom, type VoiceRoomHandle } from "@/src/components/voice/VoiceRoom";
import { finishPracticeSession } from "@/src/lib/practice/finishSession";
import { buildCoachNote } from "@/src/lib/general/coachNote";
import { generalScene } from "@/src/lib/general/scenes";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type SessionPayload = {
  session: { id: string };
};

function mapFeedbackMode(feedback: string | null): "deferred" | "immediate" {
  if (feedback === "each" || feedback === "immediate") {
    return "immediate";
  }
  return "deferred";
}

/** 避免开发环境严格模式把创建会话的请求打两次 */
let sessionCreateLock = false;

function GeneralVoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic")?.trim() || "自由对话";
  const difficulty = searchParams.get("difficulty")?.trim() || "中级";
  const feedback = searchParams.get("feedback");
  const coachNote = buildCoachNote(searchParams.get("focus"), searchParams.get("phrases"));
  const feedbackMode = mapFeedbackMode(feedback);
  const feedbackLabel = feedbackMode === "immediate" ? "每轮简短纠错" : "结束后统一纠错";

  const [sessionId, setSessionId] = useState("");
  const [pageError, setPageError] = useState("");
  const [creating, setCreating] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const roomRef = useRef<VoiceRoomHandle | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || sessionCreateLock) {
      return;
    }
    startedRef.current = true;
    sessionCreateLock = true;

    async function startSession() {
      try {
        const response = await fetch("/api/v1/practice-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "general",
            topic,
            difficulty,
            feedbackMode,
            coachNote,
          }),
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const result = (await response.json()) as ApiResponse<SessionPayload>;
        if (!result.success || !result.data?.session.id) {
          setPageError(result.error || "创建练习失败");
          return;
        }

        setSessionId(result.data.session.id);
      } catch {
        setPageError("网络错误，无法创建练习");
      } finally {
        setCreating(false);
      }
    }

    void startSession();

    return () => {
      window.setTimeout(() => {
        sessionCreateLock = false;
      }, 2000);
    };
  }, [difficulty, feedbackMode, router, topic]);

  async function endNow() {
    if (finishing) {
      return;
    }

    setFinishing(true);
    await roomRef.current?.leave();

    if (!sessionId) {
      router.push("/general");
      return;
    }

    const result = await finishPracticeSession(sessionId);
    if (result.unauthorized) {
      router.replace("/login");
      return;
    }
    router.push(`/general/summary?sessionId=${sessionId}`);
  }

  async function handleFinish() {
    if (!window.confirm("结束本轮并查看总结？语音会立刻关掉。")) {
      return;
    }
    await endNow();
  }

  if (creating) {
    return <WaitHint title="正在准备语音练习" detail="马上进入房间。请先允许麦克风。" />;
  }

  if (pageError || !sessionId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F6F3EE] px-6 py-16">
        <div className="w-full max-w-xl text-center">
          <h1 className="text-[32px] font-semibold tracking-tight">通用英语</h1>
          <p className="ink-alert mt-6" role="alert">
            {pageError || "无法开始语音练习"}
          </p>
          <Link href="/general" className="ink-btn-line mt-8">
            返回设置页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE]">
      <AppHeader />
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col px-4 py-4 sm:px-6">
      <header className="px-1 py-2">
        <p className="text-sm text-[#6F6A63]">Voice · 通用英语</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">{topic}</h1>
        <p className="mt-2 text-sm text-[#6F6F6F]">
          难度：{difficulty} · 反馈：{feedbackLabel}
        </p>
        <p className="mt-3 text-sm leading-6 text-[#1C1917]">{generalScene(topic, difficulty).welcome}</p>
        {coachNote ? <p className="mt-2 text-sm text-[#0B6654]">This round · {searchParams.get("focus")}</p> : null}
      </header>

      <SceneGoals topic={topic} difficulty={difficulty} />

      <div className="mt-4 flex flex-1">
        <VoiceRoom ref={roomRef} sessionId={sessionId} onEnded={() => void endNow()} />
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

export default function GeneralVoicePage() {
  return (
    <Suspense fallback={<WaitHint title="正在准备语音练习" detail="马上可以点麦克风开始。" />}>
      <GeneralVoiceContent />
    </Suspense>
  );
}
