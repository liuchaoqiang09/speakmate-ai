"use client";

import { useState } from "react";
import { fetchChinese } from "@/src/lib/translate/fetchChinese";

type AiChineseTranslationProps = {
  english: string;
  /** 字幕尚未定稿或不该展示时不显示按钮 */
  enabled?: boolean;
};

/**
 * AI 英文字幕下方的按需中文翻译。默认只显示按钮，点击后才翻译。
 */
export function AiChineseTranslation({
  english,
  enabled = true,
}: AiChineseTranslationProps) {
  const text = english.trim();
  const [open, setOpen] = useState(false);
  const [chinese, setChinese] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleTranslate() {
    if (!text || loading) {
      return;
    }

    setLoading(true);
    setError("");
    const result = await fetchChinese(text);
    setLoading(false);
    if (!result) {
      setError("翻译失败，请再试一次");
      return;
    }
    setChinese(result);
    setOpen(true);
  }

  if (!enabled || !text) {
    return null;
  }

  if (open && chinese) {
    return (
      <div className="mt-2">
        <p className="mt-0 text-sm leading-6 text-[#6F6F6F]">{chinese}</p>
        <button
          type="button"
          className="mt-1 text-xs font-medium text-[#0E7C66] underline-offset-2 hover:underline"
          onClick={() => setOpen(false)}
        >
          收起译文
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleTranslate()}
        className="text-xs font-medium text-[#0E7C66] underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "翻译中…" : "翻译成中文"}
      </button>
      {error ? (
        <p className="mt-1 text-xs text-[#B42318]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
