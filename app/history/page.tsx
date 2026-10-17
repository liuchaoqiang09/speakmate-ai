"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/src/components/shell/AppHeader";

type HistoryRow = {
  id: string;
  mode: string;
  topic: string | null;
  difficulty: string | null;
  durationSeconds: number | null;
  endedAt: string;
  score: string;
  nextFocus: { en: string; zh: string } | null;
  summaryHref: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [clearing, setClearing] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/v1/practice-sessions");
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = (await response.json()) as { success?: boolean; data?: { rows?: HistoryRow[] }; error?: string };
      if (!result.success) {
        setError(result.error || "无法加载历史");
        return;
      }
      setError("");
      setRows(result.data?.rows || []);
    } catch {
      setError("网络错误，无法加载历史");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [router]);

  async function deleteOne(id: string) {
    if (!window.confirm("删除这条练习？对话、总结和字幕会一起删掉，不能恢复。")) {
      return;
    }
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/v1/practice-sessions/${id}`, { method: "DELETE" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!result.success) {
        setError(result.error || "删除失败");
        return;
      }
      setRows((current) => current.filter((row) => row.id !== id));
    } catch {
      setError("网络错误，删除失败");
    } finally {
      setBusyId("");
    }
  }

  async function clearAll() {
    if (!window.confirm("清空全部练习历史？所有对话、总结、错句复习都会删除，不能恢复。")) {
      return;
    }
    setClearing(true);
    setError("");
    try {
      const response = await fetch("/api/v1/practice-sessions", { method: "DELETE" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!result.success) {
        setError(result.error || "清空失败");
        return;
      }
      setRows([]);
    } catch {
      setError("网络错误，清空失败");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE]">
      <AppHeader />
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.22em] text-[#0E7C66]">HISTORY</p>
      <h1 className="mt-3 text-[32px] font-semibold tracking-tight">Practice history</h1>
      <p className="mt-2 text-sm text-[#8A847C]">
        分数和总结保留 30 天，对话原文 5 天后自动清理。不需要的记录也可以立刻删掉。
      </p>

      {rows.length > 0 ? (
        <button
          type="button"
          className="ink-btn-line mt-6 h-12 px-4 text-sm"
          disabled={clearing || Boolean(busyId)}
          onClick={() => void clearAll()}
        >
          {clearing ? "正在清空..." : "清空全部历史"}
        </button>
      ) : null}

      {loading ? <p className="mt-8 text-sm text-[#6F6F6F]">正在加载练习历史，请稍等。</p> : null}
      {error ? (
        <p className="ink-alert mt-8" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && rows.length === 0 && !error ? (
        <p className="mt-8 text-sm text-[#6F6A63]">还没有完成的练习。先开口练一轮。</p>
      ) : null}

      <ul className="mt-8 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="ink-card p-4">
            <Link href={row.summaryHref} className="block">
              <p className="text-xs text-[#8A8A8A]">
                {row.mode === "exam" ? "考试口语" : "日常口语"} · {row.topic || "对话"}
              </p>
              <p className="mt-1 font-semibold">
                {row.score ? `参考分 ${row.score}` : "待查看总结"}
              </p>
              {row.nextFocus ? (
                <p className="mt-2 text-sm text-[#6F6A63]">{row.nextFocus.zh || row.nextFocus.en}</p>
              ) : null}
              <p className="mt-2 text-xs text-[#8A8A8A]">
                {row.durationSeconds ? `${row.durationSeconds} 秒 · ` : ""}
                {new Date(row.endedAt).toLocaleString("zh-CN")}
              </p>
            </Link>
            <button
              type="button"
              className="mt-3 text-xs font-medium text-[#B42318] underline-offset-2 hover:underline disabled:opacity-50"
              disabled={busyId === row.id || clearing}
              onClick={() => void deleteOne(row.id)}
            >
              {busyId === row.id ? "删除中..." : "删除这条"}
            </button>
          </li>
        ))}
      </ul>

    </main>
    </div>
  );
}
