import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { stopVoiceChat } from "@/src/lib/volc/startVoiceChat";

const bodySchema = z.object({
  roomId: z.string().min(1),
  taskId: z.string().min(1),
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
    return NextResponse.json({ success: false, error: "JSON 解析错误：请求体必须是合法 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "房间信息不完整" }, { status: 400 });
  }

  const result = await stopVoiceChat(parsed.data);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
