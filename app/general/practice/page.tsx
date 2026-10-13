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
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (sessionStartedRef.current || sessionCreateLock) {
      return;
    }
    sessionStartedRef.current = true;
    sessionCreateLock = true;

    async function startSession() {
      if (!topic) {
        setCreating(false);
        setPageError("缺少练习主题，请返回设置页重新开始。");
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

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sending || finishing || !sessionId || finished) {
      return;
    }

    setSendError("");
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

    try {
      const response = await fetch(
        `/api/v1/practice-sessions/${sessionId}/finish`,
        { method: "POST" }
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as ApiResponse<unknown>;
      if (!result.success) {
        setSendError(result.error || "结束练习失败");
        return;
      }

      setFinished(true);
      router.push("/general");
    } catch {
      setSendError("网络错误，无法结束练习");
    } finally {
      setFinishing(false);
    }
  }

  if (creating) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-neutral-600 dark:text-neutral-400">正在开始练习…</p>
      </main>
    );
  }

  if (pageError || !sessionId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight">通用口语</h1>
          <p
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {pageError || "无法开始练习"}
          </p>
          <Link
            href="/general"
            className="mt-8 inline-flex min-h-14 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-4 text-base font-medium text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
          >
            返回设置页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div>
          <p className="text-sm text-neutral-500">通用口语</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {topic}
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            难度：{difficulty || "未指定"} · 反馈：
            {feedbackMode === "immediate" ? "每轮简短纠错" : "结束后统一纠错"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleFinish()}
          disabled={finishing || finished}
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
        >
          {finishing ? "结束中…" : "结束练习"}
        </button>
      </header>

      <section className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !sending ? (
          <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            还没有消息。用英语打个招呼，开始练习吧。
          </p>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                message.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-neutral-900 px-4 py-3 text-sm leading-6 text-white dark:bg-white dark:text-neutral-900"
                  : "max-w-[85%] rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              }
            >
              <p className="mb-1 text-xs opacity-70">
                {message.role === "user" ? "你" : "AI 陪练"}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {sending ? (
          <p className="text-sm text-neutral-500" role="status">
            AI 正在思考...
          </p>
        ) : null}
        <div ref={listEndRef} />
      </section>

      <form
        className="sticky bottom-0 border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950"
        onSubmit={(event) => void handleSend(event)}
      >
        {sendError ? (
          <p
            className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {sendError}
          </p>
        ) : null}
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
            placeholder="用英语输入，Enter 发送，Shift+Enter 换行"
            className="min-h-12 flex-1 resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={sending || finishing || finished || !draft.trim()}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {sending ? "发送中…" : "发送"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function GeneralPracticePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-6">
          <p className="text-neutral-600 dark:text-neutral-400">加载练习页…</p>
        </main>
      }
    >
      <GeneralPracticeContent />
    </Suspense>
  );
}
