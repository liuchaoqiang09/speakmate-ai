"use client";

import { DualCaption } from "@/src/components/summary/DualCaption";
import { readSpeakingScore } from "@/src/lib/summary/speakingScore";

export function SpeakingScorePanel({ raw }: { raw: unknown }) {
  const score = readSpeakingScore(raw);
  if (!score || (score.dimensions.length === 0 && !score.advice.en && !score.advice.zh)) {
    return null;
  }

  return (
    <section className="ink-card mt-6 p-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#1F3D36]">SCORE</p>
      <h2 className="mt-2 text-lg font-semibold">
        Speaking breakdown <span className="text-sm font-normal text-[#8A8176]">分项评分</span>
      </h2>
      <p className="mt-1 text-sm text-[#8A8176]">学习参考，不是官方成绩</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-[#1F3D36]">
        {score.scale === "9" ? score.overall.toFixed(1) : score.overall}
        <span className="ml-2 text-base font-normal text-[#8A8176]">/ {score.scale}</span>
      </p>
      <ul className="mt-5 space-y-4">
        {score.dimensions.map((item) => (
          <li key={item.key}>
            <p className="text-sm font-medium">
              {item.labelZh} · {item.label}
              <span className="ml-2 text-[#1F3D36]">
                {score.scale === "9" ? item.score.toFixed(1) : item.score}
              </span>
            </p>
            {item.comment.en || item.comment.zh ? (
              <div className="mt-1">
                <DualCaption english={item.comment.en || item.comment.zh} chinese={item.comment.zh} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {score.advice.en || score.advice.zh ? (
        <div className="mt-5 rounded-2xl bg-[#F7F1E7] p-4">
          <p className="text-xs text-[#8A8176]">总结建议</p>
          <DualCaption
            english={score.advice.en || score.advice.zh}
            chinese={score.advice.zh}
            englishClassName="text-sm leading-6 font-medium"
          />
        </div>
      ) : null}
    </section>
  );
}
