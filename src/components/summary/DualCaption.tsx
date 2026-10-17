"use client";

import { useEffect, useState } from "react";
import { fetchChinese, looksMostlyChinese } from "@/src/lib/translate/fetchChinese";

type DualCaptionProps = {
  english: string;
  chinese?: string;
  strike?: boolean;
  englishClassName?: string;
};

/**
 * 总结页固定展示中英双字幕。已有中文直接显示，否则自动翻译。
 */
export function DualCaption({
  english,
  chinese = "",
  strike = false,
  englishClassName,
}: DualCaptionProps) {
  const text = english.trim();
  const provided = chinese.trim();
  const [translated, setTranslated] = useState("");

  useEffect(() => {
    if (!text || provided || looksMostlyChinese(text)) {
      setTranslated("");
      return;
    }

    let cancelled = false;
    void fetchChinese(text).then((result) => {
      if (!cancelled) {
        setTranslated(result || "");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [provided, text]);

  if (!text) {
    return null;
  }

  const zh = provided || (looksMostlyChinese(text) ? "" : translated);

  return (
    <div>
      <p className={englishClassName || (strike ? "text-sm text-[#6F6F6F] line-through" : "text-sm leading-6")}>
        {text}
      </p>
      {zh && zh !== text ? (
        <p className="mt-1 text-sm leading-6 text-[#6F6F6F]">{zh}</p>
      ) : null}
    </div>
  );
}
