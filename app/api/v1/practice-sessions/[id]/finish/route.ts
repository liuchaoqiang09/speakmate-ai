import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { endSession } from "@/src/lib/services/conversationService";

const paramsSchema = z.object({
  id: z.string().uuid("练习 ID 无效"),
});

export async function POST(
  _request: Request,
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

  const result = await endSession(params.data.id, authSession.user.id);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
