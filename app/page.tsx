"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Headphones, History, MessageSquare, Mic } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppHeader } from "@/src/components/shell/AppHeader";

type EntryCardProps = {
  kicker: string;
  title: string;
  titleZh: string;
  text: string;
  textHref: string;
  textLabel: string;
  textLabelZh: string;
  voiceHref: string;
  label: string;
};

function EntryCard({ kicker, title, titleZh, text, textHref, textLabel, textLabelZh, voiceHref, label }: EntryCardProps) {
  return (
    <section className="ink-card flex h-full min-h-[22rem] flex-col p-6 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[#B7D7CB] hover:shadow-[0_12px_28px_rgba(28,25,23,0.08)]">
      <p className="text-xs font-medium tracking-[0.22em] text-[#0E7C66]">{kicker}</p>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#1C1917]">{title}</h2>
      <p className="mt-1 text-sm text-[#8A847C]">{titleZh}</p>
      <p className="mt-3 text-sm leading-6 text-[#6F6A63]">{text}</p>
      <nav className="mt-auto flex flex-col gap-3 pt-8" aria-label={label}>
        <Link href={textHref} className="ink-btn-line w-full">
          <MessageSquare size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="flex flex-col items-start leading-none">
            <span>{textLabel}</span>
            <span className="mt-1 text-xs text-[#8A847C]">{textLabelZh}</span>
          </span>
        </Link>
        <Link href={voiceHref} className="ink-btn w-full">
          <Mic size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="flex flex-col items-start leading-none">
            <span>Voice practice</span>
            <span className="mt-1 text-xs text-white/80">语音练习</span>
          </span>
        </Link>
      </nav>
    </section>
  );
}

type TodayPlan = {
  pendingReviews: number;
  listeningWrongCount: number;
  focus: { en: string; zh: string } | null;
  topic: string;
  difficulty: string;
  voiceHref: string;
};

function topicLabel(topic: string): string {
  const labels: Record<string, string> = {
    part1: "雅思 Part 1",
    part2: "雅思 Part 2",
    part3: "雅思 Part 3",
    listen_repeat: "托福听后复述",
    interview: "托福访谈",
  };
  return labels[topic] || topic;
}

export default function Home() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const [today, setToday] = useState<TodayPlan | null>(null);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    async function load() {
      try {
        const response = await fetch("/api/v1/me/today");
        const result = (await response.json()) as { success?: boolean; data?: TodayPlan };
        if (result.success && result.data) {
          setToday(result.data);
        }
      } catch {
        setToday(null);
      }
    }
    void load();
  }, [signedIn]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F6F3EE]">
      <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-[#F6E4CF]" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-24 top-48 h-56 w-56 rounded-full bg-[#D7EFE6]" aria-hidden="true" />
      <AppHeader />
      <main className="relative mx-auto flex w-full max-w-5xl flex-col px-4 py-8 sm:px-8">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#0E7C66]">SPEAKMATE</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-[#1C1917] sm:text-5xl">
            Speak a little
            <br />
            every day
          </h1>
          <p className="mt-4 text-base leading-7 text-[#6F6A63]">日常开口，练完再看反馈</p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:mt-16 lg:grid-cols-2 lg:items-stretch">
          <EntryCard
            kicker="DAILY"
            title="General English"
            titleZh="通用英语"
            text="Pick a topic and talk it through"
            textHref="/general"
            textLabel="Scene dialogue"
            textLabelZh="场景对话"
            voiceHref="/general/voice"
            label="通用英语入口"
          />
          <EntryCard
            kicker="EXAM"
            title="IELTS & TOEFL"
            titleZh="阅读、写作、口语"
            text="Read, write, or speak a mock"
            textHref="/exam"
            textLabel="Reading and writing"
            textLabelZh="阅读和写作"
            voiceHref="/exam/voice?exam=ielts&part=part1&mode=simulation"
            label="IELTS TOEFL 入口"
          />

          <section className="ink-card flex h-full min-h-[22rem] flex-col p-6">
            <p className="text-xs font-medium tracking-[0.22em] text-[#0E7C66]">NEXT</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">接着上次练</h2>
            <p className="mt-1 text-sm text-[#8A847C]">Continue last session</p>
            <p className="mt-3 text-sm leading-6 text-[#6F6A63]">
              {today
                ? `${topicLabel(today.topic)}${today.difficulty ? ` · ${today.difficulty}` : ""}。${today.focus?.zh || today.focus?.en || "接着开口练。"}`
                : "练完一轮后，这里会出现下次该补的点。点按钮就能接着说，不用重新选题。"}
            </p>
            <nav className="mt-auto flex flex-col gap-3 pt-8" aria-label="接着练">
              <Link href={signedIn ? today?.voiceHref || "/general" : "/login"} className="ink-btn w-full">
                <Mic size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="flex flex-col items-start leading-none">
                  <span>Continue speaking</span>
                  <span className="mt-1 text-xs text-white/80">开始这次语音</span>
                </span>
              </Link>
              <Link href={signedIn ? "/review" : "/login"} className="ink-btn-line w-full">
                <MessageSquare size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="flex flex-col items-start leading-none">
                  <span>Review sentences</span>
                  <span className="mt-1 text-xs text-[#8A847C]">
                    {today && today.pendingReviews > 0 ? `跟读错过的 ${today.pendingReviews} 句` : "跟读错过的句子"}
                  </span>
                </span>
              </Link>
              <Link href={signedIn ? "/history" : "/login"} className="inline-flex items-center gap-1 text-sm font-medium text-[#0E7C66]">
                <History size={16} strokeWidth={1.75} aria-hidden="true" />
                练习历史
              </Link>
            </nav>
          </section>

          <section className="ink-card flex h-full min-h-[22rem] flex-col p-6">
            <p className="text-xs font-medium tracking-[0.22em] text-[#0E7C66]">LISTEN</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">听力训练</h2>
            <p className="mt-1 text-sm text-[#8A847C]">Listening practice</p>
            <p className="mt-3 text-sm leading-6 text-[#6F6A63]">
              雅思 Section 1–4、托福对话/讲座、四六级分区，按真实卷面出题。录音只放一遍。
            </p>
            <nav className="mt-auto flex flex-col gap-3 pt-8" aria-label="听力训练">
              <Link href={signedIn ? "/listening" : "/login"} className="ink-btn w-full">
                <Headphones size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="flex flex-col items-start leading-none">
                  <span>Start listening</span>
                  <span className="mt-1 text-xs text-white/80">开始听题</span>
                </span>
              </Link>
              <Link href={signedIn ? "/listening/wrong" : "/login"} className="ink-btn-line w-full">
                <MessageSquare size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="flex flex-col items-start leading-none">
                  <span>Retry missed items</span>
                  <span className="mt-1 text-xs text-[#8A847C]">
                    {today && today.listeningWrongCount > 0
                      ? `重听错过的 ${today.listeningWrongCount} 题`
                      : "重听错过的题"}
                  </span>
                </span>
              </Link>
              <Link href={signedIn ? "/listening/history" : "/login"} className="inline-flex items-center gap-1 text-sm font-medium text-[#0E7C66]">
                <History size={16} strokeWidth={1.75} aria-hidden="true" />
                听力记录
              </Link>
            </nav>
          </section>
        </div>
      </main>
    </div>
  );
}
