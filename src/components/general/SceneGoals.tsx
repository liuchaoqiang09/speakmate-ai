"use client";

import { useState } from "react";
import { generalScene } from "@/src/lib/general/scenes";

export function SceneGoals({ topic, difficulty }: { topic: string; difficulty?: string | null }) {
  const scene = generalScene(topic, difficulty);
  const [hintIndex, setHintIndex] = useState(-1);
  const hint = hintIndex >= 0 ? scene.hints[hintIndex % scene.hints.length] : "";

  if (scene.goals.length === 0) {
    return null;
  }

  return (
    <section className="ink-card mt-4 p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#0E7C66]">GOALS</p>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {scene.goals.map((goal, index) => (
          <li key={goal}>
            {index + 1}. {goal}
          </li>
        ))}
      </ul>
      <button type="button" className="ink-chip mt-4" onClick={() => setHintIndex((current) => current + 1)}>
        How to say this
        <span className="text-sm font-normal text-[#8A847C]">怎么说</span>
      </button>
      {hint ? <p className="mt-3 text-sm font-medium text-[#1C1917]">{hint}</p> : null}
    </section>
  );
}
