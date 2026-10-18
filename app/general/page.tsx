"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppHeader } from "@/src/components/shell/AppHeader";

const TOPICS = [
  "日常生活",
  "自我介绍",
  "餐厅点餐",
  "酒店入住",
  "购物",
  "旅行",
  "学习与工作",
  "求职面试",
] as const;

const DIFFICULTIES = ["初级", "中级", "高级"] as const;

const FEEDBACK_OPTIONS = [
  { value: "end", label: "对话优先，结束后统一纠错" },
  { value: "each", label: "每轮简短纠错" },
] as const;

type Topic = (typeof TOPICS)[number];
type Difficulty = (typeof DIFFICULTIES)[number];
type FeedbackPreference = (typeof FEEDBACK_OPTIONS)[number]["value"];

function optionClassName() {
  return "ink-chip";
}

export default function GeneralPage() {
  const router = useRouter();
  const [topic, setTopic] = useState<Topic>("日常生活");
  const [difficulty, setDifficulty] = useState<Difficulty>("初级");
  const [feedback, setFeedback] = useState<FeedbackPreference>("end");

  function startWith(kind: "practice" | "voice") {
    const params = new URLSearchParams({ topic, difficulty, feedback });
    router.push(`/general/${kind}?${params.toString()}`);
  }

  return (
    <div className="min-h-screen ">
      <AppHeader />
    <main className="flex flex-col items-center px-5 py-10 sm:px-6 sm:py-14">
      <div className="ink-card w-full max-w-xl p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#1F3D36]">DAILY</p>
        <h1 className="mt-3 text-[32px] font-semibold tracking-tight text-[#1C1712]">Daily speaking</h1>
        <p className="mt-2 text-sm text-[#8A8176]">通用口语</p>
        <p className="mt-3 text-sm leading-6 text-[#6E675E]">选好主题、难度和反馈方式</p>

        <fieldset className="mt-10">
          <legend className="text-sm font-medium text-[#1C1712]">Topic <span className="font-normal text-[#8A8176]">主题</span></legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {TOPICS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={topic === item}
                className={optionClassName()}
                onClick={() => setTopic(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-sm font-medium text-[#1C1712]">Level <span className="font-normal text-[#8A8176]">难度</span></legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {DIFFICULTIES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={difficulty === item}
                className={optionClassName()}
                onClick={() => setDifficulty(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-sm font-medium text-[#1C1712]">Feedback <span className="font-normal text-[#8A8176]">反馈</span></legend>
          <div className="mt-3 flex flex-col gap-3">
            {FEEDBACK_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={feedback === item.value}
                className={`${optionClassName()} w-full text-left sm:justify-start`}
                onClick={() => setFeedback(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <button type="button" className="ink-btn-line ink-pair w-full flex-1" onClick={() => startWith("practice")}>
            <span className="ink-pair-copy">
              <span>Text dialogue</span>
              <span>文本对话</span>
            </span>
          </button>
          <button type="button" className="ink-btn ink-pair w-full flex-1" onClick={() => startWith("voice")}>
            <span className="ink-pair-copy">
              <span>Scene dialogue</span>
              <span>场景对话</span>
            </span>
          </button>
        </div>
      </div>
    </main>
    </div>
  );
}
