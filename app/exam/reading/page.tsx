"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PaperSession } from "@/src/components/exam/PaperSession";
import { WaitHint } from "@/src/components/shell/WaitHint";

function ReadingContent() {
  const params = useSearchParams();
  const exam = params.get("exam") === "toefl" ? "toefl" : "ielts";
  return <PaperSession exam={exam} skill="reading" readingSet={params.get("set") || undefined} />;
}

export default function ExamReadingPage() {
  return (
    <Suspense fallback={<WaitHint title="正在打开阅读" detail="先看规则，再开始计时做题。" />}>
      <ReadingContent />
    </Suspense>
  );
}
