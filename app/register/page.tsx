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
        setError(result.error || "Could not create the account  注册失败");
        return;
      }

      setSuccess("Account ready  正在前往登录");
      router.push("/login");
    } catch {
      setError("Network error  请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthStage headline="Create your account" lede="邮箱和密码就够，显示名可以以后再写">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-[#1C1917]">
          <span>
            Email <span className="text-[#8A847C]">邮箱</span>
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="ink-input"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[#1C1917]">
          <span>
            Password <span className="text-[#8A847C]">至少 8 位</span>
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="ink-input"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[#1C1917]">
          <span>
            Display name <span className="text-[#8A847C]">可选</span>
          </span>
          <input
            type="text"
            maxLength={50}
            autoComplete="nickname"
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

      <p className="mt-8 text-sm text-[#6F6A63]">
        Already practicing{" "}
        <Link
          href="/login"
          className="font-medium text-[#0E7C66] underline-offset-4 transition-colors hover:underline"
        >
          Sign in
        </Link>
        <span className="text-[#8A847C]"> 登录</span>
      </p>
    </AuthStage>
  );
}
