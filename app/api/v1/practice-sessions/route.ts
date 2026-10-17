import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { createSession } from "@/src/lib/services/conversationService";
import { clearPracticeHistory, listPracticeHistory } from "@/src/lib/services/progressService";

const createSchema = z.object({
  mode: z.enum(["general", "exam"], {
    required_error: "请选择练习模式",
  }),
  examType: z.string().trim().max(50).optional().nullable(),
  topic: z
    .string({ required_error: "请选择主题" })
    .trim()
    .min(1, "请选择主题")
    .max(100),
  difficulty: z.string().trim().max(50).optional().nullable(),
  feedbackMode: z.string().trim().max(50).optional().nullable(),
  sceneDialogue: z.boolean().optional(),
  coachNote: z.string().trim().max(800).optional().nullable(),
});

export async function GET() {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const rows = await listPracticeHistory(authSession.user.id);
  return NextResponse.json({ success: true, data: { rows } });
}

export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json(
      { success: false, error: "未登录" },
      { status: 401 }
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

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { success: false, error: firstIssue?.message || "输入校验失败" },
      { status: 400 }
    );
  }

  const result = await createSession(authSession.user.id, parsed.data);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json(
    { success: true, data: result.data },
    { status: 201 }
  );
}

export async function DELETE() {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const result = await clearPracticeHistory(authSession.user.id);
  return NextResponse.json({ success: true, data: result.data });
}
