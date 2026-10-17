import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/authOptions";
import { clearReviewQueue, listReviewQueue } from "@/src/lib/services/progressService";

export async function GET() {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const items = await listReviewQueue(authSession.user.id);
  return NextResponse.json({ success: true, data: { items } });
}

export async function DELETE() {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const result = await clearReviewQueue(authSession.user.id);
  return NextResponse.json({ success: true, data: result.data });
}
