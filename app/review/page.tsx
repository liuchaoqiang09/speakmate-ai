"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/src/components/shell/AppHeader";

type ReviewItem = {
  id: string;
  itemType: string;
  prompt: string;
  expectedAnswer: string;
};

export default function ReviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/v1/review");
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const result = (await response.json()) as {
          success?: boolean;
          data?: { items?: ReviewItem[] };
          error?: string;
        };
        if (!result.success) {
          setError(result.error || "无法加载复习");
          return;
        }
        setError("");
        setItems(result.data?.items || []);
      } catch {
        setError("网络错误，无法加载复习");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  async function deleteOne(id: string) {
    if (!window.confirm("删除这句复习？删了就不能再从这里跟读。")) {
      return;
    }
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/v1/review/${id}`, { method: "DELETE" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!result.success) {
        setError(result.error || "删除失败");
        return;
      }
      setItems((current) => current.filter((item) => item.id !== id));
    } catch {
      setError("网络错误，删除失败");
    } finally {
      setBusyId("");
    }
  }

  async function clearAll() {
    if (!window.confirm("清空全部待复习句子？这些跟读卡片会删掉，不能恢复。")) {
      return;
    }
    setClearing(true);
    setError("");
    try {
      const response = await fetch("/api/v1/review", { method: "DELETE" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!result.success) {
        setError(result.error || "清空失败");
        return;
      }
      setItems([]);
    } catch {
      setError("网络错误，清空失败");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="min-h-screen ">
      <AppHeader />
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.22em] text-[#1F3D36]">REVIEW</p>
      <h1 className="mt-3 text-[32px] font-semibold tracking-tight">Say it again</h1>
      <p className="mt-2 text-sm text-[#8A8176]">
        把上次纠错过的句子再开口说一遍。未掌握的句子保留 30 天，已掌握的约 7 天后清理。
      </p>

      {items.length > 0 ? (
        <button
          type="button"
          className="ink-btn-line mt-6 h-12 px-4 text-sm"
          disabled={clearing || Boolean(busyId)}
          onClick={() => void clearAll()}
        >
          {clearing ? "正在清空..." : "清空全部句子"}
        </button>
      ) : null}

      {loading ? <p className="mt-8 text-sm text-[#6E675E]">正在加载待跟读的句子。</p> : null}
      {error ? (
        <p className="ink-alert mt-8" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && items.length === 0 && !error ? (
        <p className="mt-8 text-sm text-[#6E675E]">暂时没有待复习的句子。先完成一轮练习。</p>
      ) : null}

      <ul className="mt-8 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="ink-card p-4">
            <p className="text-xs text-[#8A8176]">{item.itemType}</p>
            <p className="mt-2 text-sm text-[#6E675E] line-through">{item.prompt}</p>
            <p className="mt-1 font-medium">{item.expectedAnswer}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link
                href={`/review/drill?id=${item.id}&prompt=${encodeURIComponent(item.prompt)}&expected=${encodeURIComponent(item.expectedAnswer)}`}
                className="ink-btn h-12 px-4 text-sm"
              >
                再练这句
              </Link>
              <button
                type="button"
                className="text-xs font-medium text-[#B42318] underline-offset-2 hover:underline disabled:opacity-50"
                disabled={busyId === item.id || clearing}
                onClick={() => void deleteOne(item.id)}
              >
                {busyId === item.id ? "删除中..." : "删除这句"}
              </button>
            </div>
          </li>
        ))}
      </ul>

    </main>
    </div>
  );
}
