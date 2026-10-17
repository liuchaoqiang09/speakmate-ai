import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/authOptions";
import { createRetryWrongSession } from "@/src/lib/services/listeningService";

export async function POST() {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const result = await createRetryWrongSession(authSession.user.id);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, data: result.data }, { status: 201 });
}
