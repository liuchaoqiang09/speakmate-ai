import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { translateEnglishToChinese } from "@/src/lib/ai/translate";

const bodySchema = z.object({
  text: z
    .string({ required_error: "请提供要翻译的英文" })
    .trim()
    .min(1, "请提供要翻译的英文")
    .max(4000, "文本过长"),
});

/**
 * 把 AI 英文字幕译成中文，供语音和文本对话展示。
 */
export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "JSON 解析错误：请求体必须是合法 JSON" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { success: false, error: firstIssue?.message || "输入校验失败" },
      { status: 400 }
    );
  }

  const result = await translateEnglishToChinese(parsed.data.text);
  if (!result.success || !result.data) {
    const missingKey = result.error?.startsWith("缺少 API Key");
    return NextResponse.json(
      { success: false, error: result.error || "翻译失败" },
      { status: missingKey ? 500 : 502 }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
