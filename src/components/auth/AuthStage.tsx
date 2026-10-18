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
    <main className="relative min-h-screen overflow-hidden px-5 py-10">
      <div
        className="glow-orb pointer-events-none absolute -left-24 -top-28 h-[26rem] w-[26rem] rounded-full bg-[#6ED0BE]/50 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="glow-orb-late pointer-events-none absolute -right-16 top-24 h-[24rem] w-[24rem] rounded-full bg-[#F3B27A]/55 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[460px] flex-col justify-center">
        <Link
          href="/"
          className="w-fit text-sm font-semibold tracking-[0.22em] text-[#1F3D36] transition-transform duration-150 hover:-translate-y-0.5"
        >
          SPEAKMATE
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight text-[#1C1712]">{headline}</h1>
        <p className="mt-3 text-sm leading-6 text-[#6E675E]">{lede}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
