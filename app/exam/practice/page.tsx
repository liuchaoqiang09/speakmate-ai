"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { WaitHint } from "@/src/components/shell/WaitHint";

/** 考试文字口语已改为阅读和写作。旧链接回到考试入口。 */
export default function ExamPracticeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/exam");
  }, [router]);

  return <WaitHint title="正在打开考试入口" detail="文字口语已改为阅读和写作，马上跳转。" />;
}
