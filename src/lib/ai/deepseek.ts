/**
 * DeepSeek API 的服务端封装。
 * 只能在服务端调用，禁止从前端或 NEXT_PUBLIC_ 变量读取密钥。
 */

export type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CallDeepSeekOptions = {
  /** 超时时间，单位毫秒，默认 30 秒 */
  timeoutMs?: number;
  temperature?: number;
};

export type CallDeepSeekResult = {
  success: boolean;
  data?: {
    content: string;
    model: string;
  };
  error?: string;
};

const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL = "deepseek-chat";

function getApiKey(): string | undefined {
  const value = process.env.DEEPSEEK_API_KEY?.trim();
  return value ? value : undefined;
}

function getModel(): string {
  const value = process.env.DEEPSEEK_MODEL?.trim();
  return value || DEFAULT_MODEL;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

type DeepSeekApiResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function callDeepSeek(
  messages: Array<{ role: string; content: string }>,
  options?: CallDeepSeekOptions
): Promise<CallDeepSeekResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: "缺少 API Key：未配置 DEEPSEEK_API_KEY",
    };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      success: false,
      error: "API 返回错误：messages 不能为空",
    };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const model = getModel();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(DEEPSEEK_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature,
      }),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsed: DeepSeekApiResponse;

    try {
      parsed = JSON.parse(rawText) as DeepSeekApiResponse;
    } catch {
      console.error("DeepSeek 响应 JSON 解析失败", {
        status: response.status,
      });
      return {
        success: false,
        error: "JSON 解析错误：DeepSeek 返回的内容不是合法 JSON",
      };
    }

    if (!response.ok) {
      const apiMessage = parsed.error?.message || `HTTP ${response.status}`;
      console.error("DeepSeek API 返回错误", {
        status: response.status,
        model,
      });
      return {
        success: false,
        error: `API 返回错误：${apiMessage}`,
      };
    }

    const content = parsed.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return {
        success: false,
        error: "API 返回错误：响应中没有可用的回复内容",
      };
    }

    return {
      success: true,
      data: {
        content,
        model: parsed.model || model,
      },
    };
  } catch (error) {
    if (isTimeoutError(error)) {
      console.error("DeepSeek 请求超时", { timeoutMs, model });
      return {
        success: false,
        error: `超时：DeepSeek 请求超过 ${timeoutMs} 毫秒`,
      };
    }

    console.error("DeepSeek 网络错误", {
      model,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      error: "网络错误：无法连接 DeepSeek 服务",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
