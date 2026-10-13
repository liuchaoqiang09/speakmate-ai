import { NextResponse } from "next/server";
import { z } from "zod";
import { callDeepSeek } from "@/src/lib/ai/deepseek";

/**
 * 开发阶段用于验证 DeepSeek 服务端调用的测试接口。
 * 正式业务请改用受保护的练习相关 API，不要在前端暴露密钥。
 *
 * 说明：当前项目的 App Router 位于根目录 app/，
 * Next.js 不能同时存在 src/app 与 app，因此本路由放在 app/api 下。
 */

const requestSchema = z.object({
  message: z
    .string({ required_error: "message 不能为空" })
    .trim()
    .min(1, "message 不能为空")
    .max(4000, "message 过长"),
});

export async function POST(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "JSON 解析错误：请求体必须是合法 JSON",
      },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: firstIssue?.message || "输入校验失败",
      },
      { status: 400 }
    );
  }

  const result = await callDeepSeek([
    {
      role: "system",
      content:
        "You are a helpful English speaking coach. Reply briefly in English.",
    },
    {
      role: "user",
      content: parsed.data.message,
    },
  ]);

  if (!result.success || !result.data) {
    const missingKey = result.error?.startsWith("缺少 API Key");
    return NextResponse.json(
      {
        success: false,
        error: result.error || "DeepSeek 调用失败",
      },
      { status: missingKey ? 500 : 502 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      reply: result.data.content,
      model: result.data.model,
    },
  });
}
