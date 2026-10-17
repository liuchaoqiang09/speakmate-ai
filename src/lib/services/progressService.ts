import { ReviewStatus } from "@prisma/client";
import { prisma } from "@/src/lib/db/prisma";
import { countWrongListening } from "@/src/lib/services/listeningService";
import { readFocusSnapshot, scheduleRetentionPurge } from "@/src/lib/services/retentionService";
import { compactScore } from "@/src/lib/summary/speakingScore";
import { asBilingualNotes } from "@/src/lib/summary/bilingual";

export async function listPracticeHistory(userId: string) {
  scheduleRetentionPurge();
  const sessions = await prisma.practiceSession.findMany({
    where: { userId, status: "completed" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      mode: true,
      examType: true,
      topic: true,
      difficulty: true,
      durationSeconds: true,
      endedAt: true,
      createdAt: true,
      summary: {
        select: {
          referenceScore: true,
          nextPracticeFocus: true,
          dataConfidence: true,
        },
      },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    mode: session.mode,
    examType: session.examType,
    topic: session.topic,
    difficulty: session.difficulty,
    durationSeconds: session.durationSeconds,
    endedAt: session.endedAt?.toISOString() || session.createdAt.toISOString(),
    score: compactScore(session.summary?.referenceScore),
    nextFocus: asBilingualNotes(session.summary?.nextPracticeFocus)[0] || null,
    dataConfidence: session.summary?.dataConfidence || null,
    summaryHref:
      session.mode === "exam"
        ? `/exam/summary?sessionId=${session.id}&exam=${session.examType || ""}&part=${session.topic || ""}`
        : `/general/summary?sessionId=${session.id}`,
  }));
}

export async function listReviewQueue(userId: string) {
  return prisma.reviewItem.findMany({
    where: { userId, status: ReviewStatus.pending },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 20,
    select: {
      id: true,
      itemType: true,
      prompt: true,
      expectedAnswer: true,
      dueAt: true,
    },
  });
}

export async function deleteReviewItem(userId: string, id: string) {
  const item = await prisma.reviewItem.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!item) {
    return { success: false as const, error: "复习项不存在", status: 404 };
  }
  await prisma.reviewItem.delete({ where: { id } });
  return { success: true as const };
}

export async function clearReviewQueue(userId: string) {
  const result = await prisma.reviewItem.deleteMany({ where: { userId } });
  return { success: true as const, data: { deleted: result.count } };
}

export async function completeReviewItem(userId: string, id: string) {
  const item = await prisma.reviewItem.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!item) {
    return { success: false as const, error: "复习项不存在", status: 404 };
  }
  await prisma.reviewItem.update({
    where: { id },
    data: { status: ReviewStatus.mastered },
  });
  return { success: true as const };
}

export async function deletePracticeSession(userId: string, sessionId: string) {
  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });
  if (!session) {
    return { success: false as const, error: "练习不存在", status: 404 };
  }

  await prisma.practiceSession.delete({ where: { id: sessionId } });
  return { success: true as const };
}

export async function clearPracticeHistory(userId: string) {
  const deleted = await prisma.$transaction(async (tx) => {
    await tx.reviewItem.deleteMany({ where: { userId } });
    const result = await tx.practiceSession.deleteMany({ where: { userId } });
    return result.count;
  });

  return { success: true as const, data: { deleted } };
}

export async function getTodayPlan(userId: string) {
  scheduleRetentionPurge();
  const latest = await prisma.sessionSummary.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      nextPracticeFocus: true,
      session: { select: { mode: true, topic: true, difficulty: true, examType: true } },
    },
  });
  const pending = await prisma.reviewItem.count({
    where: { userId, status: ReviewStatus.pending },
  });
  const listeningWrongCount = await countWrongListening(userId);
  const stored =
    latest == null
      ? await prisma.learningProfile.findUnique({
          where: { userId },
          select: { currentFocus: true },
        })
      : null;
  const snapshot = latest ? null : readFocusSnapshot(stored?.currentFocus);
  const focus = latest
    ? asBilingualNotes(latest.nextPracticeFocus)[0]
    : snapshot
      ? { en: snapshot.en, zh: snapshot.zh }
      : null;
  const topic = latest?.session.topic || snapshot?.topic || "日常生活";
  const difficulty = latest?.session.difficulty || snapshot?.difficulty || "初级";
  const exam = latest?.session.examType || snapshot?.examType || "ielts";
  const isExam = (latest?.session.mode || snapshot?.mode) === "exam";

  return {
    pendingReviews: pending,
    listeningWrongCount,
    focus: focus,
    topic,
    difficulty,
    voiceHref: isExam
      ? `/exam/voice?exam=${exam}&part=${topic}&mode=practice`
      : `/general/voice?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`,
    textHref: isExam
      ? `/exam/voice?exam=${exam}&part=${topic}&mode=practice`
      : `/general/practice?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`,
    reviewHref: "/review",
    historyHref: "/history",
  };
}
