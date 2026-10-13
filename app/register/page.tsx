"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ApiResponse = {
  success: boolean;
  data?: { id: string; email: string; displayName: string | null };
  error?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName: displayName.trim() || undefined,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.success) {
        setError(result.error || "注册失败");
        return;
      }

      setSuccess("注册成功，即将前往登录页");
      router.push("/login");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <div className="w-full max-w-xl">
        <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">
          注册
        </h1>
        <p className="mt-4 text-center text-lg text-neutral-600 dark:text-neutral-400">
          使用邮箱和密码创建 SpeakMate AI 账号。
        </p>

        <form className="mt-10 flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium">
            邮箱
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-base font-normal text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            密码（至少 8 位）
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-base font-normal text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            显示名（可选）
            <input
              type="text"
              maxLength={50}
              autoComplete="nickname"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="min-h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-base font-normal text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-neutral-900 px-6 py-4 text-base font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {loading ? "提交中…" : "注册"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
          已有账号？{" "}
          <Link href="/login" className="font-medium underline underline-offset-4">
            去登录
          </Link>
        </p>
      </div>
    </main>
  );
}
