import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { submitListening } from "@/src/lib/services/listeningService";

export const maxDuration = 30;

const paramsSchema = z.object({
  id: z.string().uuid("练习编号无效"),
});

const bodySchema = z.object({
  answers: z.record(z.string().max(80)).refine((answers) => Object.keys(answers).length <= 40, "答案过多"),
});

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const params = paramsSchema.safeParse(context.params);
  if (!params.success) {
    return NextResponse.json({ success: false, error: "练习编号无效" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON 解析错误：请求体必须是合法 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "请提交答案" }, { status: 400 });
  }

  const result = await submitListening(authSession.user.id, params.data.id, parsed.data.answers);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data });
}
