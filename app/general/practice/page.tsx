
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { SceneGoals } from "@/src/components/general/SceneGoals";
import { AppHeader } from "@/src/components/shell/AppHeader";
import { WaitHint } from "@/src/components/shell/WaitHint";
import { AiChineseTranslation } from "@/src/components/practice/AiChineseTranslation";
import { MicButton, SpeechStatusLine } from "@/src/components/practice/MicButton";
import { buildCoachNote } from "@/src/lib/general/coachNote";
import { finishPracticeSession } from "@/src/lib/practice/finishSession";
import { useSpeechRecognition } from "@/src/lib/speech/useSpeechRecognition";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type SessionPayload = {
  session: {
    id: string;
  };
  opening?: {
    id: string;
    contentText: string;
  } | null;
};

type MessagesPayload = {
  userMessage: { id: string; contentText: string };
  assistantMessage: { id: string; contentText: string };
};

function mapFeedbackMode(feedback: string | null): "deferred" | "immediate" {
  if (feedback === "each" || feedback === "immediate") {
    return "immediate";
  }
  return "deferred";
}

/** 避免 React Strict Mode 在开发环境把创建会话的请求打两次 */
let sessionCreateLock = false;

function GeneralPracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic")?.trim() || "";
  const difficulty = searchParams.get("difficulty")?.trim() || "";
  const feedback = searchParams.get("feedback");
  const feedbackMode = mapFeedbackMode(feedback);
  const coachNote = buildCoachNote(searchParams.get("focus"), searchParams.get("phrases"));

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pageError, setPageError] = useState("");
  const [sendError, setSendError] = useState("");
  const [creating, setCreating] = useState(true);
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);

  const sessionStartedRef = useRef(false);
  const sendingRef = useRef(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const speech = useSpeechRecognition({
    onFinal: (text) => {
      void handleSend(undefined, text);
    },
  });

  useEffect(() => {
    if (sessionStartedRef.current || sessionCreateLock) {
      return;
    }
    sessionStartedRef.current = true;
    sessionCreateLock = true;

    async function startSession() {
      if (!topic) {
        setCreating(false);
        setPageError("缺少练习主题，请返回设置页重新开始");
        return;
      }

      try {
        const response = await fetch("/api/v1/practice-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "general",
            topic,
            difficulty: difficulty || undefined,
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

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(event?: FormEvent, override?: string) {
    event?.preventDefault();
    const content = (override ?? draft).trim();
    if (!content || sendingRef.current || finishing || !sessionId || finished) {
      return;
    }

    if (override) {
      setDraft(override);
    }

    setSendError("");
    sendingRef.current = true;
    setSending(true);

    try {
      const response = await fetch(
        `/api/v1/practice-sessions/${sessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as ApiResponse<MessagesPayload>;
      if (!result.success || !result.data) {
        setSendError(result.error || "发送失败，请重试");
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: result.data!.userMessage.id,
          role: "user",
          content: result.data!.userMessage.contentText,
        },
        {
          id: result.data!.assistantMessage.id,
          role: "assistant",
          content: result.data!.assistantMessage.contentText,
        },
      ]);
      setDraft("");
    } catch {
      setSendError("网络错误，消息未发送");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  async function handleFinish() {
    if (!sessionId || finishing || finished) {
      return;
    }

    setFinishing(true);
    setSendError("");

    const result = await finishPracticeSession(sessionId);
    if (result.unauthorized) {
      router.replace("/login");
      return;
    }
    if (!result.ok) {
      setSendError(result.error);
      setFinishing(false);
      return;
    }

    setFinished(true);
    router.push(`/general/summary?sessionId=${sessionId}`);
    setFinishing(false);
  }

  if (creating) {
    return <WaitHint title="正在打开文本对话" detail="准备场景和第一句，请稍等。" />;
  }

  if (pageError || !sessionId) {
    return (
      <div className="min-h-screen bg-[#F6F3EE]">
        <AppHeader />
        <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-xl text-center">
            <h1 className="text-[32px] font-semibold tracking-tight">Text dialogue</h1>
            <p className="mt-1 text-sm text-[#8A847C]">文本对话</p>
            <p className="ink-alert mt-6" role="alert">
              {pageError || "无法开始练习"}
            </p>
            <Link href="/general" className="ink-btn-line mt-8">
              返回设置页
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE]">
      <AppHeader />
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-[#E6E6E6] px-4 py-4">
        <div>
          <p className="text-sm text-[#6F6A63]">Text dialogue · 文本对话</p>
          <h1 className="text-2xl font-semibold tracking-tight">{topic}</h1>
          <p className="mt-1 text-sm text-[#6F6F6F]">
            难度：{difficulty || "未指定"} · 反馈：
            {feedbackMode === "immediate" ? "每轮简短纠错" : "结束后统一纠错"}
          </p>
          {coachNote ? <p className="mt-2 text-sm text-[#0B6654]">This round · {searchParams.get("focus")}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void handleFinish()}
          disabled={finishing || finished}
          className="ink-btn-line h-12 shrink-0 px-4 text-sm"
        >
          {finishing ? "Ending" : "End session"}
        </button>
      </header>

      <div className="px-4 pt-4">
        <SceneGoals topic={topic} difficulty={difficulty} />
      </div>

      <section className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5">
        {messages.length === 0 && !sending ? (
          <p className="rounded-2xl border border-[#E6E6E6] bg-white px-4 py-3 text-sm text-[#6F6F6F]">
            Say hello in English · 用英语打个招呼
          </p>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div className={message.role === "user" ? "bubble-user" : "bubble-ai"}>
              <p
                className={
                  message.role === "user"
                    ? "mb-1 text-xs font-medium text-white/65"
                    : "mb-1 text-xs font-medium text-[#6F6F6F]"
                }
              >
                {message.role === "user" ? "You" : "SpeakMate"}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === "assistant" ? (
                <AiChineseTranslation english={message.content} />
              ) : null}
            </div>
          </div>
        ))}

        {sending ? (
          <p className="text-sm text-[#6F6F6F]" role="status">
            Thinking · 正在想下一句
          </p>
        ) : null}
        <div ref={listEndRef} />
      </section>

      <form
        className="sticky bottom-0 border-t border-[#E6E6E6] bg-[#F6F3EE] px-4 py-4"
        onSubmit={(event) => void handleSend(event)}
      >
        {sendError ? (
          <p className="ink-alert mb-3" role="alert">
            {sendError}
          </p>
        ) : null}
        <SpeechStatusLine
          phase={speech.phase}
          transcript={speech.transcript}
          error={speech.error}
        />
        <div className="flex items-end gap-3">
          <label className="sr-only" htmlFor="practice-input">
            输入英语消息
          </label>
          <textarea
            id="practice-input"
            rows={2}
            value={draft}
            disabled={sending || finishing || finished}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleEditorKeyDown}
            placeholder="Write in English"
            className="ink-input flex-1"
          />
          <MicButton
            disabled={sending || finishing || finished || !sessionId}
            supported={speech.isSupported}
            supportChecked={speech.supportChecked}
            listening={speech.isListening}
            onStart={speech.start}
            onStop={speech.stop}
          />
          <button
            type="submit"
            disabled={sending || finishing || finished || !draft.trim()}
            className="ink-btn h-14 shrink-0 px-5"
          >
            {sending ? "Sending" : "Send"}
          </button>
        </div>
        {speech.supportChecked && !speech.isSupported ? (
          <p className="mt-2 text-xs text-[#8A8A8A]">当前浏览器不支持语音输入，请用 Chrome 或 Edge</p>
        ) : null}
      </form>
    </main>
    </div>
  );
}

export default function GeneralPracticePage() {
  return (
    <Suspense fallback={<WaitHint title="正在打开练习页" detail="马上可以开始打字对话。" />}>
      <GeneralPracticeContent />
    </Suspense>
  );
}
