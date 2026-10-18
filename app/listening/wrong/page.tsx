"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/src/components/shell/AppHeader";
import { WaitHint } from "@/src/components/shell/WaitHint";

export default function ListeningWrongPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function start() {
      try {
        const response = await fetch("/api/v1/listening/retry", { method: "POST" });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const result = (await response.json()) as {
          success?: boolean;
          data?: { id: string };
          error?: string;
        };
        if (!result.success || !result.data?.id) {
          setError(result.error || "还没有听错的题");
          return;
        }
        router.replace(`/listening/practice?id=${result.data.id}`);
      } catch {
        setError("网络错误，无法打开错题");
      }
    }
    void start();
  }, [router]);

  if (!error) {
    return <WaitHint title="正在取出错过的题" detail="只重听你上次听错的部分。" />;
  }

  return (
    <div className="min-h-screen ">
      <AppHeader />
      <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6">
        <p className="ink-alert" role="alert">
          {error}
        </p>
        <Link href="/listening" className="ink-btn mt-6">
          去听新的一段
        </Link>
        <Link href="/" className="ink-btn-line mt-3">
          返回首页
        </Link>
      </main>
    </div>
  );
}
