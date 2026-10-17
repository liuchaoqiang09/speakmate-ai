import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { prisma } from "@/src/lib/db/prisma";
import { saveVoiceMessage } from "@/src/lib/services/conversationService";

const paramsSchema = z.object({
  id: z.string().uuid("练习 ID 无效"),
});

const bodySchema = z.object({
  role: z.enum(["user", "assistant"], {
    errorMap: () => ({ message: "说话人只能是用户或 AI" }),
  }),
  contentText: z
    .string({ required_error: "请提供字幕文本" })
    .trim()
    .min(1, "请提供字幕文本")
    .max(8000, "字幕过长"),
});

/**
 * 只保存语音字幕，不调用 DeepSeek。
 * 文字模式仍走 POST /practice-sessions/:id/messages。
 */
export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json(
      { success: false, error: "未登录" },
      { status: 401 }
    );
  }

  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json(
      { success: false, error: params.error.issues[0]?.message || "练习 ID 无效" },
      { status: 400 }
    );
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

  const practice = await prisma.practiceSession.findFirst({
    where: { id: params.data.id, userId: authSession.user.id },
    select: { userId: true },
  });
  if (!practice || practice.userId !== authSession.user.id) {
    return NextResponse.json({ success: false, error: "练习不存在" }, { status: 404 });
  }

  const result = await saveVoiceMessage(
    params.data.id,
    authSession.user.id,
    parsed.data.role,
    parsed.data.contentText
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
