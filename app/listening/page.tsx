"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppHeader } from "@/src/components/shell/AppHeader";
import { WaitHint } from "@/src/components/shell/WaitHint";
import {
  LISTENING_GROUPS,
  LISTENING_LEVELS,
  LISTENING_MODULES,
  type ListeningGroup,
} from "@/src/lib/listening/modules";

export default function ListeningSetupPage() {
  const router = useRouter();
  const [group, setGroup] = useState<ListeningGroup>("ielts");
  const [topic, setTopic] = useState("ielts_s1");
  const [difficulty, setDifficulty] = useState<(typeof LISTENING_LEVELS)[number]["id"]>("初级");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const modules = useMemo(
    () => LISTENING_MODULES.filter((item) => item.group === group),
    [group]
  );
  const selected = modules.find((item) => item.id === topic) || modules[0];
  const exam = group !== "daily";

  async function start() {
    if (!selected) {
      return;
    }
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/v1/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: selected.id, difficulty }),
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = (await response.json()) as {
        success?: boolean;
        data?: { id: string };
        error?: string;
      };
      if (!result.success || !result.data?.id) {
        setError(result.error || "无法生成听力材料");
        return;
      }
      router.push(`/listening/practice?id=${result.data.id}`);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setStarting(false);
    }
  }

  if (starting) {
    return <WaitHint title="正在出卷" detail="听力材料和题目大约半分钟，请不要离开这一页。" />;
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE]">
      <AppHeader />
    <main className="flex flex-col items-center px-5 py-10 sm:px-6 sm:py-14">
      <div className="ink-card w-full max-w-xl p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#0E7C66]">LISTEN</p>
        <h1 className="mt-3 text-[32px] font-semibold tracking-tight">听力训练</h1>
        <p className="mt-2 text-sm text-[#8A847C]">Exam-style sections</p>
        <p className="mt-3 text-sm leading-6 text-[#6F6A63]">
          按真实考试分区练：雅思 Section 1–4、托福对话/讲座、四六级新闻/长对话/短文/讲座。录音只放一遍，题型和难度跟该部分绑定。
        </p>

        <fieldset className="mt-10">
          <legend className="text-sm font-medium">考试 / 类型</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {LISTENING_GROUPS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="ink-chip"
                aria-pressed={group === item.id}
                onClick={() => {
                  setGroup(item.id);
                  const first = LISTENING_MODULES.find((module) => module.group === item.id);
                  if (first) {
                    setTopic(first.id);
                  }
                }}
              >
                {item.labelZh}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-sm font-medium">{exam ? "试卷部分" : "场景"}</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {modules.map((item) => (
              <button
                key={item.id}
                type="button"
                className="ink-chip"
                aria-pressed={selected?.id === item.id}
                onClick={() => setTopic(item.id)}
              >
                {item.labelZh}
              </button>
            ))}
          </div>
        </fieldset>

        {selected ? (
          <section className="mt-8 rounded-2xl bg-[#F7F7F5] p-4 text-sm leading-6 text-[#6F6A63]">
            <p className="font-medium text-[#1C1917]">{selected.examLabel}</p>
            <p className="mt-2">{selected.rulesZh}</p>
            <p className="mt-2 text-xs text-[#8A8A8A]">
              难度：{selected.difficulty}
              {exam ? "（由该部分决定，不能自选）" : "（日常听力可自选）"} · {selected.questionsMin}
              {selected.questionsMin === selected.questionsMax ? "" : `–${selected.questionsMax}`} 题 ·{" "}
              {selected.voiceLang === "en-GB" ? "英音" : "美音"}
            </p>
          </section>
        ) : null}

        {!exam ? (
          <fieldset className="mt-8">
            <legend className="text-sm font-medium">难度</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {LISTENING_LEVELS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ink-chip"
                  aria-pressed={difficulty === item.id}
                  onClick={() => setDifficulty(item.id)}
                >
                  {item.id}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-[#8A8A8A]">
              {LISTENING_LEVELS.find((item) => item.id === difficulty)?.hint}
            </p>
          </fieldset>
        ) : null}

        {error ? (
          <p className="ink-alert mt-6" role="alert">
            {error}
          </p>
        ) : null}

        <button type="button" className="ink-btn mt-8 w-full" disabled={starting} onClick={() => void start()}>
          {starting ? "正在出卷，大约半分钟，请不要离开..." : exam ? "开始这一部分" : "开始听题"}
        </button>
        <Link href="/listening/wrong" className="ink-btn-line mt-3 w-full">
          重听错过的题
        </Link>
        <Link href="/listening/history" className="mt-4 inline-flex text-sm font-medium text-[#0E7C66]">
          听力记录
        </Link>
      </div>
    </main>
    </div>
  );
}
