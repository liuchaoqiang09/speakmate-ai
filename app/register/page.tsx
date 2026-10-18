"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthStage } from "@/src/components/auth/AuthStage";

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
        setError(result.error || "Could not create the account 注册失败");
        return;
      }

      setSuccess("如果这个邮箱还没有账号，已经创建好了。请登录。如果以前注册过，请用原来的密码。");
      router.push("/login");
    } catch {
      setError("Network error 请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthStage headline="Create your account" lede="邮箱和密码就够，显示名可以以后再写">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-[#1C1712]">
          <span>
            Email <span className="text-[#8A8176]">邮箱</span>
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="ink-input"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[#1C1712]">
          <span>
            Password <span className="text-[#8A8176]">至少 8 位</span>
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="至少 8 位"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="ink-input"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[#1C1712]">
          <span>
            Display name <span className="text-[#8A8176]">可选</span>
          </span>
          <input
            type="text"
            maxLength={50}
            autoComplete="nickname"
            placeholder="怎么称呼你"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="ink-input"
          />
        </label>

        {error ? (
          <p className="ink-alert" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="ink-note" role="status">
            {success}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className="ink-btn w-full">
          {loading ? "Creating" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-sm text-[#6E675E]">
        Already practicing{" "}
        <Link
          href="/login"
          className="font-medium text-[#1F3D36] underline-offset-4 transition-colors hover:underline"
        >
          Sign in
        </Link>
        <span className="text-[#8A8176]"> 登录</span>
      </p>
    </AuthStage>
  );
}
