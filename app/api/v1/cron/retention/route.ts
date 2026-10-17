import { NextResponse } from "next/server";
import { purgeExpiredData } from "@/src/lib/services/retentionService";

export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization") || "";
  const fromHeader = request.headers.get("x-cron-secret") || "";
  return header === `Bearer ${secret}` || fromHeader === secret;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });
  }
  const data = await purgeExpiredData();
  return NextResponse.json({ success: true, data });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
