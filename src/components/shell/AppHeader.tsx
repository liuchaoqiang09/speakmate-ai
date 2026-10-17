"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const LINKS = [
  { href: "/", label: "Home", labelZh: "首页" },
  { href: "/general", label: "Speak", labelZh: "开口" },
  { href: "/exam", label: "Exam", labelZh: "考试" },
  { href: "/listening", label: "Listen", labelZh: "听力" },
  { href: "/history", label: "History", labelZh: "历史" },
  { href: "/settings", label: "Settings", labelZh: "设置" },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated";
  const displayName = session?.user?.name?.trim() || "there";

  return (
    <header className="sticky top-0 z-30 border-b border-[#ECE7DF] bg-[#F6F3EE]/95 px-4 py-3 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-[#0E7C66]">
            SPEAKMATE
          </Link>
          <nav className="flex items-center gap-3 text-sm" aria-label="账号">
            {signedIn ? (
              <>
                <span className="hidden items-center gap-1.5 text-[#6F6A63] sm:inline-flex">
                  <User size={16} strokeWidth={1.75} aria-hidden="true" />
                  Hello, {displayName}
                </span>
                <Link href="/settings" className="text-[#0E7C66]" aria-label="设置">
                  <Settings size={16} strokeWidth={1.75} />
                </Link>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium text-[#0E7C66]"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                >
                  <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="font-medium text-[#1C1917]">
                  Sign in <span className="text-[#8A847C]">登录</span>
                </Link>
                <Link href="/register" className="rounded-full bg-[#E7F6F1] px-3 py-1 font-medium text-[#0E7C66]">
                  Join <span className="font-normal">注册</span>
                </Link>
              </>
            )}
          </nav>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto pb-0.5 text-sm" aria-label="主要功能">
          {LINKS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 ${
                  active ? "bg-[#E7F6F1] font-medium text-[#0E7C66]" : "text-[#6F6A63]"
                }`}
              >
                {item.labelZh}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
