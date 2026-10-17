import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/authOptions";
import { prisma } from "@/src/lib/db/prisma";
import { compactScore } from "@/src/lib/summary/speakingScore";

type HistoryRow = {
  label: string;
  score: string;
  at: string;
};

function bandFromResult(result: unknown): string {
  if (!result || typeof result !== "object") {
    return "";
  }
  const record = result as { band?: unknown; overall?: unknown };
  const value = typeof record.band === "number" ? record.band : typeof record.overall === "number" ? record.overall : null;
  return value === null ? "" : String(value);
}

function speakingScore(raw: unknown): string {
  return compactScore(raw);
}

export async function GET(request: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const exam = new URL(request.url).searchParams.get("exam")?.trim().toLowerCase() || "";
  const userId = authSession.user.id;

  const papers = await prisma.examPaper.findMany({
    where: {
      userId,
      status: "submitted",
      ...(exam ? { examType: exam } : {}),
    },
    orderBy: { submittedAt: "desc" },
    take: 20,
    select: { examType: true, skill: true, result: true, submittedAt: true },
  });

  const speaking = await prisma.sessionSummary.findMany({
    where: {
      userId,
      session: { mode: "exam", ...(exam ? { examType: exam } : {}) },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      referenceScore: true,
      createdAt: true,
      session: { select: { examType: true, topic: true } },
    },
  });

  const rows: HistoryRow[] = [
    ...papers.map((paper) => ({
      label: `${paper.examType.toUpperCase()} ${paper.skill}`,
      score: bandFromResult(paper.result),
      at: (paper.submittedAt || new Date()).toISOString(),
    })),
    ...speaking.map((item) => ({
      label: `${(item.session.examType || "exam").toUpperCase()} ${item.session.topic || "speaking"}`,
      score: speakingScore(item.referenceScore),
      at: item.createdAt.toISOString(),
    })),
  ]
    .filter((item) => item.score)
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 5);

  return NextResponse.json({ success: true, data: { rows } });
}
