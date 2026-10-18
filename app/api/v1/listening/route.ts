import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { getListeningModule, getListeningPaper } from "@/src/lib/listening/modules";
import {
  clearListeningHistory,
  createListeningSession,
  listListeningHistory,
} from "@/src/lib/services/listeningService";

export const maxDuration = 120;

const bodySchema = z.object({
  topic: z.string().min(1),
  difficulty: z.enum(["初级", "中级", "高级"]).optional().default("中级"),
});

export async function GET() {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const rows = await listListeningHistory(authSession.user.id);
  return NextResponse.json({ success: true, data: { rows } });
}

export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON 解析错误：请求体必须是合法 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || (!getListeningModule(parsed.data.topic) && !getListeningPaper(parsed.data.topic))) {
    return NextResponse.json({ success: false, error: "请选择听力模块" }, { status: 400 });
  }

  const result = await createListeningSession(
    authSession.user.id,
    parsed.data.topic,
    parsed.data.difficulty
  );
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: 201 });
}

export async function DELETE() {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const result = await clearListeningHistory(authSession.user.id);
  return NextResponse.json({ success: true, data: result.data });
}
