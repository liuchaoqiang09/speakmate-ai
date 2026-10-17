"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/** 让客户端页面可以使用 useSession / signOut。 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
