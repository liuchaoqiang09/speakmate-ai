import Link from "next/link";
import type { ReactNode } from "react";

type AuthStageProps = {
  headline: string;
  lede: string;
  children: ReactNode;
};

/** 登录和注册共用的浅色版式，不处理表单提交。 */
export function AuthStage({ headline, lede, children }: AuthStageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F6F3EE] px-5 py-10">
      <div
        className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[#D7EFE6]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 top-32 h-64 w-64 rounded-full bg-[#F6E4CF]"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[460px] flex-col justify-center">
        <Link
          href="/"
          className="w-fit text-sm font-semibold tracking-[0.22em] text-[#0E7C66] transition-transform duration-150 hover:-translate-y-0.5"
        >
          SPEAKMATE
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight text-[#1C1917]">{headline}</h1>
        <p className="mt-3 text-sm leading-6 text-[#6F6A63]">{lede}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
