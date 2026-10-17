import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { submitExamPaper } from "@/src/lib/services/examPaperService";

export const maxDuration = 120;

const paramsSchema = z.object({
  id: z.string().uuid("试卷编号无效"),
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
    return NextResponse.json({ success: false, error: "试卷编号无效" }, { status: 400 });
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

  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return NextResponse.json({ success: false, error: "请提交答案" }, { status: 400 });
  }
  if (JSON.stringify(json).length > 80_000) {
    return NextResponse.json({ success: false, error: "答案过长" }, { status: 400 });
  }

  const result = await submitExamPaper(
    authSession.user.id,
    params.data.id,
    json as Record<string, unknown>
  );
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data });
}
