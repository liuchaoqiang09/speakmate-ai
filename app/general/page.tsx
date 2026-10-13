"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TOPICS = [
  "日常生活",
  "自我介绍",
  "餐厅点餐",
  "酒店入住",
  "购物",
  "旅行",
  "学习与工作",
  "求职面试",
  "自由对话",
] as const;

const DIFFICULTIES = ["初级", "中级", "高级"] as const;

const FEEDBACK_OPTIONS = [
  { value: "end", label: "对话优先，结束后统一纠错" },
  { value: "each", label: "每轮简短纠错" },
] as const;

type Topic = (typeof TOPICS)[number];
type Difficulty = (typeof DIFFICULTIES)[number];
type FeedbackPreference = (typeof FEEDBACK_OPTIONS)[number]["value"];

function optionClassName(selected: boolean) {
  if (selected) {
    return "inline-flex min-h-12 items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-white dark:text-neutral-900";
  }

  return "inline-flex min-h-12 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800";
}

export default function GeneralPage() {
  const router = useRouter();
  const [topic, setTopic] = useState<Topic>("日常生活");
  const [difficulty, setDifficulty] = useState<Difficulty>("初级");
  const [feedback, setFeedback] = useState<FeedbackPreference>("end");

  function handleStartPractice() {
    const settings = { topic, difficulty, feedback };
    console.log("通用口语训练设置", settings);
    const params = new URLSearchParams(settings);
    router.push(`/general/practice?${params.toString()}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <div className="w-full max-w-xl">
        <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">
          通用口语
        </h1>
        <p className="mt-4 text-center text-lg text-neutral-600 dark:text-neutral-400">
          选择主题、难度和反馈方式后开始练习。
        </p>

        <fieldset className="mt-10">
          <legend className="text-base font-medium">选择主题 / 场景</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {TOPICS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={topic === item}
                className={optionClassName(topic === item)}
                onClick={() => setTopic(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-base font-medium">选择难度</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {DIFFICULTIES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={difficulty === item}
                className={optionClassName(difficulty === item)}
                onClick={() => setDifficulty(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-base font-medium">选择反馈偏好</legend>
          <div className="mt-3 flex flex-col gap-3">
            {FEEDBACK_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={feedback === item.value}
                className={`${optionClassName(feedback === item.value)} w-full text-left sm:justify-start`}
                onClick={() => setFeedback(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-12 flex flex-col gap-4">
          <button
            type="button"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-neutral-900 px-6 py-4 text-base font-medium text-white transition hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            onClick={handleStartPractice}
          >
            开始练习
          </button>
          <Link
            href="/"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-4 text-base font-medium text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
          >
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
