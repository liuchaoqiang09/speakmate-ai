import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { addMessage } from "@/src/lib/services/conversationService";

const paramsSchema = z.object({
  id: z.string().uuid("练习 ID 无效"),
});

const bodySchema = z.object({
  content: z
    .string({ required_error: "请输入消息内容" })
    .trim()
    .min(1, "请输入消息内容")
    .max(4000, "消息过长"),
});

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

  const result = await addMessage(
    params.data.id,
    authSession.user.id,
    parsed.data.content
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
