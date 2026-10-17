"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/src/components/shell/AppHeader";
import { findReadingSet, readingSetsFor } from "@/src/lib/exam/readingSets";

type PaperExam = "ielts" | "toefl";
type PaperSkill = "reading" | "writing";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type Question = {
  id: string;
  type: string;
  prompt?: string;
  options?: string[];
  wordLimit?: number;
  paragraph?: string;
};

type Passage = {
  title: string;
  paragraphs: Array<{ label: string; text: string }>;
  headings?: Array<{ id: string; text: string }>;
  questions: Question[];
};

type PublicPaper = {
  exam: PaperExam;
  skill: PaperSkill;
  minutes: number;
  passages?: Passage[];
  completeWords?: { sentence: string; blanks: Array<{ id: string; prefix: string }> };
  dailyLife?: Array<{ title: string; body: string; questions: Question[] }>;
  academic?: { title: string; paragraphs: string[]; questions: Question[] };
  task1?: { minutes: number; minimumWords: number; prompt: string; table: { columns: string[]; rows: string[][] } };
  task2?: { minutes: number; minimumWords: number; prompt: string };
  sentences?: Array<{ id: string; speakerLine: string; tokens: string[] }>;
  email?: { minutes: number; scenario: string; points: string[] };
  discussion?: { minutes: number; professor: string; studentA: string; studentB: string };
};

const RULES: Record<string, { title: string; titleZh: string; lines: string[] }> = {
  "ielts:reading": {
    title: "IELTS Academic Reading",
    titleZh: "学术类阅读",
    lines: [
      "3 passages, from a factual text to an argument",
      "60 minutes, no extra transfer time",
      "Question types follow the live test: True False Not Given, Yes No Not Given, headings, completion, multiple choice",
      "Answers over the word limit are marked wrong",
    ],
  },
  "ielts:writing": {
    title: "IELTS Academic Writing",
    titleZh: "学术类写作",
    lines: [
      "Task 1: describe the table, at least 150 words, about 20 minutes",
      "Task 2: essay, at least 250 words, about 40 minutes",
      "60 minutes for both tasks",
      "Task 2 counts twice Task 1",
    ],
  },
  "toefl:reading": {
    title: "TOEFL Reading",
    titleZh: "2026 阅读",
    lines: [
      "Complete the Words, Read in Daily Life, then an academic passage",
      "About 30 minutes for this practice set",
      "Daily life and the passage are multiple choice",
      "The full official section is longer. This set uses the same task types",
    ],
  },
  "toefl:writing": {
    title: "TOEFL Writing",
    titleZh: "2026 写作",
    lines: [
      "Build a Sentence: 10 items, right or wrong",
      "Write an Email: 7 minutes",
      "Write for an Academic Discussion: 10 minutes",
      "About 23 minutes altogether",
    ],
  },
};

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function PaperSession({
  exam,
  skill,
  readingSet,
}: {
  exam: PaperExam;
  skill: PaperSkill;
  readingSet?: string;
}) {
  const router = useRouter();
  const sets = skill === "reading" ? readingSetsFor(exam) : [];
  const [selectedSet, setSelectedSet] = useState(findReadingSet(exam, readingSet).id);
  const activeSet = sets.find((item) => item.id === selectedSet) || sets[0];
  const rule = activeSet
    ? {
        title: `${exam === "ielts" ? "IELTS" : "TOEFL"} ${activeSet.label}`,
        titleZh: activeSet.labelZh,
        lines: [`${activeSet.minutes} minutes`, activeSet.types, "The passage is written for this task, then marked from the answer key"],
      }
    : RULES[`${exam}:${skill}`];
  const [phase, setPhase] = useState<"ready" | "creating" | "live" | "scoring" | "done">("ready");
  const [error, setError] = useState("");
  const [paperId, setPaperId] = useState("");
  const [paper, setPaper] = useState<PublicPaper | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<Record<string, string[]>>({});
  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [email, setEmail] = useState("");
  const [discussion, setDiscussion] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [passageIndex, setPassageIndex] = useState(0);
  const autoSubmittedRef = useRef(false);

  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;

  useEffect(() => {
    if (phase !== "live") {
      return;
    }
    const endsAt = Date.now() + secondsRef.current * 1000;
    const timer = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSeconds((current) => (current === remain ? current : remain));
    }, 500);
    return () => window.clearInterval(timer);
  }, [phase]);

  const passage = paper?.passages?.[passageIndex];
  const headingChoices = passage?.headings || [];

  const usedHeadings = useMemo(() => {
    if (!passage) {
      return new Set<string>();
    }
    return new Set(
      passage.questions
        .filter((question) => question.type === "matching_heading")
        .map((question) => answers[question.id])
        .filter(Boolean)
    );
  }, [answers, passage]);

  async function startPaper() {
    autoSubmittedRef.current = false;
    setPhase("creating");
    setError("");
    try {
      const response = await fetch("/api/v1/exam-papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: exam, skill, readingSet: activeSet?.id }),
      });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      const payload = (await response.json()) as ApiResponse<{ paper: { id: string; publicContent: PublicPaper } }>;
      if (!response.ok || !payload.success || !payload.data) {
        setError(payload.error || "无法生成试卷");
        setPhase("ready");
        return;
      }
      setPaperId(payload.data.paper.id);
      setPaper(payload.data.paper.publicContent);
      setSeconds((payload.data.paper.publicContent.minutes || 60) * 60);
      setPhase("live");
    } catch {
      setError("网络错误，无法生成试卷");
      setPhase("ready");
    }
  }

  async function submitPaper() {
    if (!paperId || phase === "scoring") {
      return;
    }
    setPhase("scoring");
    setError("");
    const body =
      skill === "reading"
        ? answers
        : exam === "ielts"
          ? { task1, task2 }
          : { sentences: orders, email, discussion };
    try {
      const response = await fetch(`/api/v1/exam-papers/${paperId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      const payload = (await response.json()) as ApiResponse<{ result: Record<string, unknown> }>;
      if (!response.ok || !payload.success || !payload.data?.result) {
        setError(payload.error || "评分失败");
        setPhase("live");
        return;
      }
      setResult(payload.data.result);
      setPhase("done");
    } catch {
      setError("网络错误，评分没有完成");
      setPhase("live");
    }
  }

  const submitRef = useRef(submitPaper);
  submitRef.current = submitPaper;

  useEffect(() => {
    if (phase !== "live" || seconds !== 0 || autoSubmittedRef.current) {
      return;
    }
    autoSubmittedRef.current = true;
    void submitRef.current();
  }, [phase, seconds]);

  function setAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function toggleToken(id: string, token: string, source: string[]) {
    setOrders((current) => {
      const chosen = current[id] || [];
      if (chosen.includes(token) && chosen.filter((item) => item === token).length >= source.filter((item) => item === token).length) {
        return { ...current, [id]: chosen.filter((item, index) => item !== token || index !== chosen.lastIndexOf(token)) };
      }
      const used = chosen.filter((item) => item === token).length;
      const available = source.filter((item) => item === token).length;
      if (used >= available) {
        return current;
      }
      return { ...current, [id]: [...chosen, token] };
    });
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE]">
      <AppHeader />
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#0E7C66]">{exam.toUpperCase()}</p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">{rule.title}</h1>
          <p className="mt-1 text-sm text-[#8A847C]">{rule.titleZh}</p>
        </div>
        {phase === "live" || phase === "scoring" ? (
          <button type="button" onClick={() => router.push("/exam")} className="ink-btn-line shrink-0 px-4 text-sm">
            Leave
            <span className="text-sm font-normal text-[#8A847C]">退出</span>
          </button>
        ) : null}
      </header>

      {phase === "ready" || phase === "creating" ? (
        <section className="ink-card mt-6 p-5">
          {sets.length > 0 ? (
            <label className="mb-5 block text-sm font-medium">
              Passage <span className="font-normal text-[#8A847C]">文章</span>
              <select
                className="ink-input mt-2"
                value={selectedSet}
                onChange={(event) => setSelectedSet(event.target.value)}
              >
                {sets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.labelZh}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <ul className="space-y-3 text-sm leading-6">
            {rule.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {error ? <p className="ink-alert mt-4" role="alert">{error}</p> : null}
          <button type="button" className="ink-btn mt-6 w-full" disabled={phase === "creating"} onClick={() => void startPaper()}>
            {phase === "creating" ? "正在出卷，大约十几秒..." : "Start · 开始"}
          </button>
          <Link href="/exam" className="ink-btn-line mt-3 w-full">Back</Link>
        </section>
      ) : null}

      {phase === "live" || phase === "scoring" ? (
        <>
          <p className="mt-4 text-sm font-medium text-[#0B6654]" role="timer">
            Time {formatClock(seconds)}{seconds === 0 ? " · Time is up" : ""}
          </p>
          {error ? <p className="ink-alert mt-4" role="alert">{error}</p> : null}

          {skill === "reading" && paper?.passages ? (
            <section className="mt-4">
              <div className="flex flex-wrap gap-2">
                {paper.passages.map((item, index) => (
                  <button key={item.title} type="button" className="ink-chip" aria-pressed={index === passageIndex} onClick={() => setPassageIndex(index)}>
                    Passage {index + 1}
                  </button>
                ))}
              </div>
              {passage ? (
                <article className="ink-card mt-4 p-5">
                  <h2 className="text-xl font-semibold">{passage.title}</h2>
                  {passage.paragraphs.map((paragraph) => (
                    <p key={paragraph.label} className="mt-4 text-sm leading-7">
                      <span className="mr-2 font-semibold">{paragraph.label}</span>
                      {paragraph.text}
                    </p>
                  ))}
                  <div className="mt-6 flex flex-col gap-4">
                    {passage.questions.map((question, index) => (
                      <label key={question.id} className="block text-sm">
                        <span className="font-medium">{index + 1}. {question.prompt || `Paragraph ${question.paragraph}`}</span>
                        {question.type === "multiple_choice" ? (
                          <span className="mt-2 flex flex-col gap-2">
                            {question.options?.map((option) => (
                              <button key={option} type="button" className="ink-chip w-full text-left" aria-pressed={answers[question.id] === option} onClick={() => setAnswer(question.id, option)}>
                                {option}
                              </button>
                            ))}
                          </span>
                        ) : null}
                        {question.type === "true_false_not_given" || question.type === "yes_no_not_given" ? (
                          <span className="mt-2 flex flex-wrap gap-2">
                            {(question.type === "true_false_not_given" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"]).map((option) => (
                              <button key={option} type="button" className="ink-chip" aria-pressed={answers[question.id] === option} onClick={() => setAnswer(question.id, option)}>
                                {option}
                              </button>
                            ))}
                          </span>
                        ) : null}
                        {question.type === "matching_heading" ? (
                          <span className="mt-2 flex flex-col gap-2">
                            {headingChoices.map((heading) => (
                              <button
                                key={heading.id}
                                type="button"
                                className="ink-chip w-full text-left"
                                aria-pressed={answers[question.id] === heading.id}
                                disabled={usedHeadings.has(heading.id) && answers[question.id] !== heading.id}
                                onClick={() => setAnswer(question.id, heading.id)}
                              >
                                {heading.id}. {heading.text}
                              </button>
                            ))}
                          </span>
                        ) : null}
                        {question.type === "completion" ? (
                          <input
                            className="ink-input mt-2"
                            value={answers[question.id] || ""}
                            placeholder={`No more than ${question.wordLimit || 2} words`}
                            onChange={(event) => setAnswer(question.id, event.target.value)}
                          />
                        ) : null}
                      </label>
                    ))}
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}

          {skill === "reading" && paper?.completeWords ? (
            <section className="mt-4 flex flex-col gap-4">
              <article className="ink-card p-5">
                <h2 className="text-lg font-semibold">Complete the Words</h2>
                <p className="mt-3 text-sm leading-7">{paper.completeWords.sentence}</p>
                <div className="mt-4 flex flex-col gap-3">
                  {paper.completeWords.blanks.map((blank) => (
                    <label key={blank.id} className="text-sm">
                      {blank.prefix}
                      <input className="ink-input mt-1" value={answers[blank.id] || ""} onChange={(event) => setAnswer(blank.id, event.target.value)} />
                    </label>
                  ))}
                </div>
              </article>
              {paper.dailyLife?.map((text) => (
                <article key={text.title} className="ink-card p-5">
                  <h2 className="text-lg font-semibold">{text.title}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{text.body}</p>
                  {text.questions.map((question) => (
                    <div key={question.id} className="mt-4">
                      <p className="text-sm font-medium">{question.prompt}</p>
                      <div className="mt-2 flex flex-col gap-2">
                        {question.options?.map((option) => (
                          <button key={option} type="button" className="ink-chip w-full text-left" aria-pressed={answers[question.id] === option} onClick={() => setAnswer(question.id, option)}>
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </article>
              ))}
              {paper.academic ? (
                <article className="ink-card p-5">
                  <h2 className="text-lg font-semibold">{paper.academic.title}</h2>
                  {paper.academic.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 24)} className="mt-3 text-sm leading-7">{paragraph}</p>
                  ))}
                  {paper.academic.questions.map((question) => (
                    <div key={question.id} className="mt-4">
                      <p className="text-sm font-medium">{question.prompt}</p>
                      <div className="mt-2 flex flex-col gap-2">
                        {question.options?.map((option) => (
                          <button key={option} type="button" className="ink-chip w-full text-left" aria-pressed={answers[question.id] === option} onClick={() => setAnswer(question.id, option)}>
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </article>
              ) : null}
            </section>
          ) : null}

          {skill === "writing" && paper?.task1 && paper.task2 ? (
            <section className="mt-4 flex flex-col gap-4">
              <article className="ink-card p-5">
                <h2 className="text-lg font-semibold">Task 1 · {paper.task1.minimumWords} words</h2>
                <p className="mt-3 text-sm leading-7">{paper.task1.prompt}</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>{paper.task1.table.columns.map((column) => <th key={column} className="border-b border-[#E7E1D8] py-2 pr-3">{column}</th>)}</tr>
                    </thead>
                    <tbody>
                      {paper.task1.table.rows.map((row) => (
                        <tr key={row.join("-")}>{row.map((cell) => <td key={cell} className="border-b border-[#F0EBE3] py-2 pr-3">{cell}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <textarea className="ink-input mt-4 min-h-40" value={task1} onChange={(event) => setTask1(event.target.value)} />
                <p className="mt-2 text-xs text-[#8A847C]">{countWords(task1)} words</p>
              </article>
              <article className="ink-card p-5">
                <h2 className="text-lg font-semibold">Task 2 · {paper.task2.minimumWords} words</h2>
                <p className="mt-3 text-sm leading-7">{paper.task2.prompt}</p>
                <textarea className="ink-input mt-4 min-h-52" value={task2} onChange={(event) => setTask2(event.target.value)} />
                <p className="mt-2 text-xs text-[#8A847C]">{countWords(task2)} words</p>
              </article>
            </section>
          ) : null}

          {skill === "writing" && paper?.sentences ? (
            <section className="mt-4 flex flex-col gap-4">
              {paper.sentences.map((item, index) => {
                const chosen = orders[item.id] || [];
                return (
                  <article key={item.id} className="ink-card p-5">
                    <h2 className="text-sm font-semibold">Build a Sentence {index + 1}</h2>
                    <p className="mt-2 text-sm leading-6">{item.speakerLine}</p>
                    <p className="mt-3 min-h-8 text-sm font-medium">{chosen.join(" ") || "Tap the words in order"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.tokens.map((token, tokenIndex) => (
                        <button key={`${token}-${tokenIndex}`} type="button" className="ink-chip" onClick={() => toggleToken(item.id, token, item.tokens)}>
                          {token}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
              {paper.email ? (
                <article className="ink-card p-5">
                  <h2 className="text-lg font-semibold">Write an Email · {paper.email.minutes} min</h2>
                  <p className="mt-3 text-sm leading-7">{paper.email.scenario}</p>
                  <ul className="mt-3 list-disc pl-5 text-sm leading-6">
                    {paper.email.points.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                  <textarea className="ink-input mt-4 min-h-36" value={email} onChange={(event) => setEmail(event.target.value)} />
                  <p className="mt-2 text-xs text-[#8A847C]">{countWords(email)} words</p>
                </article>
              ) : null}
              {paper.discussion ? (
                <article className="ink-card p-5">
                  <h2 className="text-lg font-semibold">Academic Discussion · {paper.discussion.minutes} min</h2>
                  <p className="mt-3 text-sm leading-7">{paper.discussion.professor}</p>
                  <p className="mt-3 text-sm leading-7">{paper.discussion.studentA}</p>
                  <p className="mt-3 text-sm leading-7">{paper.discussion.studentB}</p>
                  <textarea className="ink-input mt-4 min-h-40" value={discussion} onChange={(event) => setDiscussion(event.target.value)} />
                  <p className="mt-2 text-xs text-[#8A847C]">{countWords(discussion)} words</p>
                </article>
              ) : null}
            </section>
          ) : null}

          <button type="button" className="ink-btn mt-6 w-full" disabled={phase === "scoring"} onClick={() => void submitPaper()}>
            {phase === "scoring" ? "Scoring" : "Submit"}
          </button>
          <button type="button" className="ink-btn-dark mt-3 w-full" onClick={() => router.push("/exam")}>
            Leave
            <span className="text-sm font-normal text-white/70">退出</span>
          </button>
        </>
      ) : null}

      {phase === "done" && result ? <ScoreCard result={result} /> : null}
      {phase === "done" ? <Link href="/exam" className="ink-btn-line mt-4 w-full">Another paper</Link> : null}
    </main>
    </div>
  );
}

function ScoreCard({ result }: { result: Record<string, unknown> }) {
  const band = typeof result.band === "number" ? result.band : typeof result.overall === "number" ? result.overall : null;
  const correct = typeof result.correct === "number" ? result.correct : null;
  const total = typeof result.total === "number" ? result.total : null;
  const items = Array.isArray(result.items) ? result.items : [];
  return (
    <section className="ink-card mt-6 p-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#0E7C66]">REFERENCE</p>
      {band !== null ? <p className="mt-3 text-4xl font-semibold text-[#0E7C66]">{band}</p> : null}
      {correct !== null && total !== null ? <p className="mt-2 text-sm">{correct} / {total}</p> : null}
      {typeof result.note === "string" ? <p className="mt-3 text-sm leading-6 text-[#6F6A63]">{result.note}</p> : null}
      <p className="mt-3 text-sm text-[#8A847C]">参考分，不是官方成绩</p>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {items.slice(0, 12).map((item) => {
            const row = item as { id?: string; correct?: boolean; expected?: string; given?: string; explanation?: string };
            return (
              <li key={row.id}>
                {row.correct ? "Right" : "Wrong"} · {row.given || "blank"} → {row.expected}
                {!row.correct && row.explanation ? <span className="mt-1 block text-[#6F6A63]">{row.explanation}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {result.task1 && typeof result.task1 === "object" ? <WritingLines label="Task 1" value={result.task1 as Record<string, unknown>} /> : null}
      {result.task2 && typeof result.task2 === "object" ? <WritingLines label="Task 2" value={result.task2 as Record<string, unknown>} /> : null}
      {result.email && typeof result.email === "object" ? <WritingLines label="Email" value={result.email as Record<string, unknown>} /> : null}
      {result.discussion && typeof result.discussion === "object" ? <WritingLines label="Discussion" value={result.discussion as Record<string, unknown>} /> : null}
    </section>
  );
}

function WritingLines({ label, value }: { label: string; value: Record<string, unknown> }) {
  const score = typeof value.overall === "number" ? value.overall : typeof value.score === "number" ? value.score : null;
  const missed = Array.isArray(value.missedPoints) ? value.missedPoints.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  return (
    <div className="mt-4 border-t border-[#E7E1D8] pt-3 text-sm leading-6">
      <p className="font-semibold">{label}{score !== null ? ` · ${score}` : ""}</p>
      {typeof value.comment === "string" ? <p className="mt-1">{value.comment}</p> : null}
      {missed.length > 0 ? <p className="mt-2 text-[#6F6A63]">Missing · {missed.join(" · ")}</p> : null}
    </div>
  );
}
