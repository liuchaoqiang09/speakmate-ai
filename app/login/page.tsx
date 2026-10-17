"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { AuthStage } from "@/src/components/auth/AuthStage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Email or password is incorrect  邮箱或密码不正确");
        return;
      }

      setSuccess("Signed in  正在进入首页");
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error  请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthStage headline="Welcome back" lede="用邮箱继续练习">
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
            Password <span className="text-[#8A847C]">密码</span>
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
          {loading ? "Signing in" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-sm text-[#6F6A63]">
        New here{" "}
        <Link
          href="/register"
          className="font-medium text-[#0E7C66] underline-offset-4 transition-colors hover:underline"
        >
          Create an account
        </Link>
        <span className="text-[#8A847C]"> 注册</span>
      </p>
    </AuthStage>
  );
}
