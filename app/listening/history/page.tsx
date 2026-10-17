"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/src/components/shell/AppHeader";

type HistoryRow = {
  id: string;
  topic: string;
  topicLabel: string;
  difficulty: string;
  title: string;
  status: string;
  score: string;
  at: string;
  href: string;
};

export default function ListeningHistoryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [clearing, setClearing] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/v1/listening");
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = (await response.json()) as { success?: boolean; data?: { rows?: HistoryRow[] }; error?: string };
      if (!result.success) {
        setError(result.error || "无法加载听力记录");
        return;
      }
      setError("");
      setRows(result.data?.rows || []);
    } catch {
      setError("网络错误，无法加载听力记录");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [router]);

  async function deleteOne(id: string) {
    if (!window.confirm("删除这条听力？原文、题目和作答会一起删掉，不能恢复。")) {
      return;
    }
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/v1/listening/${id}`, { method: "DELETE" });
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
    if (!window.confirm("清空全部听力记录？所有听力材料和作答都会删除，不能恢复。")) {
      return;
    }
    setClearing(true);
    setError("");
    try {
      const response = await fetch("/api/v1/listening", { method: "DELETE" });
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
      <p className="text-xs font-semibold tracking-[0.22em] text-[#0E7C66]">LISTEN</p>
      <h1 className="mt-3 text-[32px] font-semibold tracking-tight">听力记录</h1>
      <p className="mt-2 text-sm text-[#8A847C]">
        分数保留 30 天，听力原文 5 天后自动清理。不需要的记录也可以立刻删掉。
      </p>

      {rows.length > 0 ? (
        <button
          type="button"
          className="ink-btn-line mt-6 h-12 px-4 text-sm"
          disabled={clearing || Boolean(busyId)}
          onClick={() => void clearAll()}
        >
          {clearing ? "正在清空..." : "清空全部听力"}
        </button>
      ) : null}

      {loading ? <p className="mt-8 text-sm text-[#6F6F6F]">正在加载听力记录。</p> : null}
      {error ? (
        <p className="ink-alert mt-8" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && rows.length === 0 && !error ? (
        <p className="mt-8 text-sm text-[#6F6A63]">还没有听力记录。先听一轮再回来。</p>
      ) : null}

      <ul className="mt-8 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="ink-card p-4">
            <Link href={row.href} className="block">
              <p className="text-xs text-[#8A8A8A]">
                {row.topicLabel} · {row.difficulty}
                {row.status === "in_progress" ? " · 未提交" : ""}
              </p>
              <p className="mt-1 font-semibold">{row.title}</p>
              <p className="mt-2 text-sm text-[#6F6A63]">{row.score ? `听对 ${row.score}` : "还没交卷"}</p>
              <p className="mt-2 text-xs text-[#8A8A8A]">{new Date(row.at).toLocaleString("zh-CN")}</p>
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

      <Link href="/listening" className="ink-btn-line mt-10">
        再听一段
      </Link>
    </main>
    </div>
  );
}
