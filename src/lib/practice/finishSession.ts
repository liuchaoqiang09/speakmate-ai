type ApiResponse = {
  success?: boolean;
  error?: string;
};

/**
 * 结束练习并尽量生成总结。总结页还会再拉一次，避免结束接口超时后空白。
 */
export async function finishPracticeSession(sessionId: string): Promise<{
  ok: boolean;
  unauthorized: boolean;
  error: string;
}> {
  try {
    const response = await fetch(`/api/v1/practice-sessions/${sessionId}/finish`, {
      method: "POST",
    });
    if (response.status === 401) {
      return { ok: false, unauthorized: true, error: "未登录" };
    }
    const result = (await response.json().catch(() => null)) as ApiResponse | null;
    if (response.ok && result?.success) {
      return { ok: true, unauthorized: false, error: "" };
    }
  } catch {
    // 结束失败时仍去请求总结，可能已经写完会话
  }

  try {
    const summary = await fetch(`/api/v1/practice-sessions/${sessionId}/summary`);
    if (summary.status === 401) {
      return { ok: false, unauthorized: true, error: "未登录" };
    }
    const result = (await summary.json().catch(() => null)) as ApiResponse | null;
    if (summary.ok && result?.success) {
      return { ok: true, unauthorized: false, error: "" };
    }
    return {
      ok: false,
      unauthorized: false,
      error: result?.error || "总结还没生成，请稍后在历史里打开",
    };
  } catch {
    return { ok: false, unauthorized: false, error: "网络错误，无法结束练习" };
  }
}
