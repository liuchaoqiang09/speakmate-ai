"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PaperSession } from "@/src/components/exam/PaperSession";
import { WaitHint } from "@/src/components/shell/WaitHint";

function WritingContent() {
  const params = useSearchParams();
  const exam = params.get("exam") === "toefl" ? "toefl" : "ielts";
  return <PaperSession exam={exam} skill="writing" />;
}

export default function ExamWritingPage() {
  return (
    <Suspense fallback={<WaitHint title="正在打开写作" detail="先看规则，再开始计时写作。" />}>
      <WritingContent />
    </Suspense>
  );
}
