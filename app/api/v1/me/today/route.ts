import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/authOptions";
import { getTodayPlan } from "@/src/lib/services/progressService";

export async function GET() {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const plan = await getTodayPlan(authSession.user.id);
  return NextResponse.json({ success: true, data: plan });
}
