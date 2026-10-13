"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMS = [
  { value: "ielts", label: "IELTS" },
  { value: "toefl", label: "TOEFL" },
] as const;

const IELTS_PARTS = [
  { value: "part1", label: "Part 1 日常问答" },
  { value: "part2", label: "Part 2 个人陈述" },
  { value: "part3", label: "Part 3 深入讨论" },
] as const;

const TOEFL_PARTS = [
  { value: "pending", label: "题型待核实后补充" },
] as const;

const MODES = [
  { value: "practice", label: "练习模式：允许提示与指导" },
  { value: "simulation", label: "模拟模式：尽量按指定流程进行，结束后统一反馈" },
] as const;

type ExamType = (typeof EXAMS)[number]["value"];
type Mode = (typeof MODES)[number]["value"];
type IeltsPart = (typeof IELTS_PARTS)[number]["value"];
type ToeflPart = (typeof TOEFL_PARTS)[number]["value"];
type Part = IeltsPart | ToeflPart;

function optionClassName(selected: boolean) {
  if (selected) {
    return "inline-flex min-h-12 items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:bg-white dark:text-neutral-900";
  }

  return "inline-flex min-h-12 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800";
}

export default function ExamPage() {
  const router = useRouter();
  const [exam, setExam] = useState<ExamType>("ielts");
  const [part, setPart] = useState<Part>("part1");
  const [mode, setMode] = useState<Mode>("practice");

  const parts = exam === "ielts" ? IELTS_PARTS : TOEFL_PARTS;

  function handleSelectExam(nextExam: ExamType) {
    setExam(nextExam);
    setPart(nextExam === "ielts" ? "part1" : "pending");
  }

  function handleStartTraining() {
    const settings = { exam, part, mode };
    console.log("考试口语训练设置", settings);
    const params = new URLSearchParams(settings);
    router.push(`/exam/practice?${params.toString()}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <div className="w-full max-w-xl">
        <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">
          IELTS / TOEFL 口语训练
        </h1>
        <p className="mt-4 text-center text-lg text-neutral-600 dark:text-neutral-400">
          选择考试类型、题型和练习模式后开始训练。
        </p>

        <fieldset className="mt-10">
          <legend className="text-base font-medium">选择考试类型</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {EXAMS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={exam === item.value}
                className={optionClassName(exam === item.value)}
                onClick={() => handleSelectExam(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-base font-medium">选择题型 / 练习任务</legend>
          {exam === "toefl" ? (
            <p
              className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              role="status"
            >
              TOEFL 题型待核实当前官方考试要求后补充
            </p>
          ) : null}
          <div className="mt-3 flex flex-col gap-3">
            {parts.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={part === item.value}
                className={`${optionClassName(part === item.value)} w-full text-left sm:justify-start`}
                onClick={() => setPart(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-base font-medium">选择练习模式</legend>
          <div className="mt-3 flex flex-col gap-3">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={mode === item.value}
                className={`${optionClassName(mode === item.value)} w-full text-left sm:justify-start`}
                onClick={() => setMode(item.value)}
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
            onClick={handleStartTraining}
          >
            开始训练
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
