"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/src/components/shell/AppHeader";
import { findReadingSet, readingSetsFor } from "@/src/lib/exam/readingSets";

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
  { value: "listen_repeat", label: "Listen and Repeat 听后复述" },
  { value: "interview", label: "Take an Interview 访谈" },
] as const;

type ExamType = (typeof EXAMS)[number]["value"];
type IeltsPart = (typeof IELTS_PARTS)[number]["value"];
type ToeflPart = (typeof TOEFL_PARTS)[number]["value"];
type Part = IeltsPart | ToeflPart;

function optionClassName() {
  return "ink-chip";
}

export default function ExamPage() {
  const router = useRouter();
  const [exam, setExam] = useState<ExamType>("ielts");
  const [part, setPart] = useState<Part>("part1");
  const [readingSet, setReadingSet] = useState("passage1");
  const [history, setHistory] = useState<Array<{ label: string; score: string }>>([]);

  const parts = exam === "ielts" ? IELTS_PARTS : TOEFL_PARTS;

  useEffect(() => {
    let ignore = false;
    async function loadHistory() {
      try {
        const response = await fetch(`/api/v1/exam-history?exam=${exam}`);
        if (!response.ok) {
          return;
        }
        const result = (await response.json()) as { success?: boolean; data?: { rows?: Array<{ label: string; score: string }> } };
        if (!ignore && result.success && result.data?.rows) {
          setHistory(result.data.rows);
        }
      } catch {
        if (!ignore) {
          setHistory([]);
        }
      }
    }
    void loadHistory();
    return () => {
      ignore = true;
    };
  }, [exam]);

  function handleSelectExam(nextExam: ExamType) {
    setExam(nextExam);
    setPart(nextExam === "ielts" ? "part1" : "listen_repeat");
    setReadingSet(nextExam === "ielts" ? "passage1" : "complete_words");
  }

  function startVoice(mode: "practice" | "simulation") {
    const params = new URLSearchParams({ exam, part, mode });
    router.push(`/exam/voice?${params.toString()}`);
  }

  function startPaper(skill: "reading" | "writing") {
    const params = new URLSearchParams({ exam });
    if (skill === "reading") {
      params.set("set", readingSet);
    }
    router.push(`/exam/${skill}?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE]">
      <AppHeader />
    <main className="flex flex-col items-center px-5 py-10 sm:px-6 sm:py-14">
      <div className="ink-card w-full max-w-xl p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#0E7C66]">EXAM</p>
        <h1 className="mt-3 text-[32px] font-semibold tracking-tight text-[#1C1917]">IELTS & TOEFL</h1>
        <p className="mt-2 text-sm text-[#8A847C]">阅读、写作、口语</p>
        <p className="mt-3 text-sm leading-6 text-[#6F6A63]">先选考试，再进入阅读、写作或口语</p>

        <fieldset className="mt-10">
          <legend className="text-sm font-medium text-[#1C1917]">Exam <span className="font-normal text-[#8A847C]">考试</span></legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {EXAMS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={exam === item.value}
                className={optionClassName()}
                onClick={() => handleSelectExam(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-8 block text-sm font-medium text-[#1C1917]">
          Reading <span className="font-normal text-[#8A847C]">文章</span>
          <select
            className="ink-input mt-2"
            value={readingSet}
            onChange={(event) => setReadingSet(event.target.value)}
          >
            {readingSetsFor(exam).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} · {item.labelZh}
              </option>
            ))}
          </select>
          <span className="mt-2 block font-normal leading-6 text-[#6F6A63]">{findReadingSet(exam, readingSet).types}</span>
        </label>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button type="button" className="ink-btn w-full flex-1" onClick={() => startPaper("reading")}>
            Reading
          </button>
          <button type="button" className="ink-btn w-full flex-1" onClick={() => startPaper("writing")}>
            Writing
          </button>
        </div>

        <fieldset className="mt-8">
          <legend className="text-sm font-medium text-[#1C1917]">Speaking <span className="font-normal text-[#8A847C]">口语部分</span></legend>
          <div className="mt-3 flex flex-col gap-3">
            {parts.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={part === item.value}
                className={`${optionClassName()} w-full text-left sm:justify-start`}
                onClick={() => setPart(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-col gap-3">
          <button type="button" className="ink-btn w-full" onClick={() => startVoice("practice")}>
            Practice with hints
            <span className="ml-2 text-xs font-normal text-white/80">练习模式</span>
          </button>
          <button type="button" className="ink-btn-line w-full" onClick={() => startVoice("simulation")}>
            Full mock
            <span className="ml-2 text-xs font-normal text-[#8A847C]">模拟模式</span>
          </button>
        </div>
        {history.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-sm font-medium">Recent scores <span className="font-normal text-[#8A847C]">最近分数 · 原文 5 天、分数 30 天</span></h2>
            <ul className="mt-3 space-y-2 text-sm">
              {history.map((item, index) => (
                <li key={`${item.label}-${index}`} className="flex justify-between gap-3">
                  <span>{item.label}</span>
                  <span className="font-semibold text-[#0E7C66]">{item.score}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
    </div>
  );
}
