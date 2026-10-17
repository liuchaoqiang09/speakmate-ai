import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { createExamPaper } from "@/src/lib/services/examPaperService";

export const maxDuration = 300;

const bodySchema = z.object({
  examType: z.enum(["ielts", "toefl"]),
  skill: z.enum(["reading", "writing"]),
  readingSet: z.string().trim().max(40).optional(),
});

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
    return NextResponse.json({ success: false, error: "请选择考试和科目" }, { status: 400 });
  }

  const result = await createExamPaper(
    authSession.user.id,
    parsed.data.examType,
    parsed.data.skill,
    parsed.data.readingSet
  );
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: 201 });
}
