import { callDeepSeek } from "@/src/lib/ai/deepseek";

const TRANSLATE_SYSTEM_PROMPT = [
  "You translate English dialogue into Simplified Chinese for English learners.",
  "Return only the Chinese translation.",
  "Do not add quotation marks, pinyin, notes, or explanations.",
  "Keep the meaning and tone of the original sentence.",
].join(" ");

export type TranslateEnglishResult = {
  success: boolean;
  data?: { chinese: string };
  error?: string;
};

/**
 * 把一句英语口语字幕译成简体中文。只在服务端调用。
 */
export async function translateEnglishToChinese(
  english: string
): Promise<TranslateEnglishResult> {
  const text = english.trim();
  if (!text) {
    return { success: false, error: "没有可翻译的文本" };
  }

  const result = await callDeepSeek(
    [
      { role: "system", content: TRANSLATE_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    { timeoutMs: 20_000, temperature: 0.2 }
  );

  if (!result.success || !result.data) {
    return { success: false, error: result.error || "翻译失败" };
  }

  const chinese = result.data.content.trim();
  if (!chinese) {
    return { success: false, error: "翻译结果为空" };
  }

  return { success: true, data: { chinese } };
}
