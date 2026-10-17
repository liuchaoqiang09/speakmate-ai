type TranslatePayload = {
  chinese: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const translationCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

export function looksMostlyChinese(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  const cjk = trimmed.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return cjk >= 2 && cjk / trimmed.length >= 0.28;
}

/**
 * 浏览器请求英文到中文翻译。相同句子会复用缓存。
 */
export async function fetchChinese(english: string): Promise<string | null> {
  const text = english.trim();
  if (!text) {
    return null;
  }
  if (looksMostlyChinese(text)) {
    return text;
  }

  const cached = translationCache.get(text);
  if (cached) {
    return cached;
  }

  const pending = inflight.get(text);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const response = await fetch("/api/v1/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.status === 401) {
        window.location.assign("/login");
        return null;
      }

      const result = (await response.json()) as ApiResponse<TranslatePayload>;
      const chinese = result.data?.chinese?.trim();
      if (!result.success || !chinese) {
        return null;
      }

      translationCache.set(text, chinese);
      return chinese;
    } catch {
      return null;
    } finally {
      inflight.delete(text);
    }
  })();

  inflight.set(text, request);
  return request;
}
