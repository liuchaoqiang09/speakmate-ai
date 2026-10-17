import { Prisma, ReviewStatus } from "@prisma/client";
import { prisma } from "@/src/lib/db/prisma";
import { asBilingualNotes } from "@/src/lib/summary/bilingual";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** 未完成的会话 */
export const ABANDONED_AFTER_MS = DAY_MS;
/** 对话全文、听力/试卷原文 */
export const BULKY_AFTER_MS = 5 * DAY_MS;
/** 总结、分数行、未掌握错题 */
export const KEEP_SUMMARY_MS = 30 * DAY_MS;
/** 已掌握的错题 */
export const MASTERED_REVIEW_MS = 7 * DAY_MS;
const OPPORTUNISTIC_GAP_MS = 6 * HOUR_MS;

export const RETENTION_COPY =
  "对话和听力原文保留 5 天，分数与总结保留 30 天，错题未掌握保留 30 天。账号不会删。";

type FocusSnapshot = {
  zh: string;
  en: string;
  topic: string;
  difficulty: string;
  mode: string;
  examType: string;
};

let lastPurgeAt = 0;
let purging = false;

function ago(ms: number): Date {
  return new Date(Date.now() - ms);
}

function parseFocusSnapshot(raw: string | null | undefined): FocusSnapshot | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as FocusSnapshot;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      zh: parsed.zh || "",
      en: parsed.en || "",
      topic: parsed.topic || "日常生活",
      difficulty: parsed.difficulty || "初级",
      mode: parsed.mode || "general",
      examType: parsed.examType || "ielts",
    };
  } catch {
    return {
      zh: raw,
      en: "",
      topic: "日常生活",
      difficulty: "初级",
      mode: "general",
      examType: "ielts",
    };
  }
}

export function readFocusSnapshot(raw: string | null | undefined): FocusSnapshot | null {
  return parseFocusSnapshot(raw);
}

async function snapshotLatestFocus(userId: string) {
  const latest = await prisma.sessionSummary.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      nextPracticeFocus: true,
      session: { select: { mode: true, topic: true, difficulty: true, examType: true } },
    },
  });
  if (!latest) {
    return;
  }
  const focus = asBilingualNotes(latest.nextPracticeFocus)[0];
  const payload: FocusSnapshot = {
    zh: focus?.zh || "",
    en: focus?.en || "",
    topic: latest.session.topic || "日常生活",
    difficulty: latest.session.difficulty || "初级",
    mode: latest.session.mode,
    examType: latest.session.examType || "ielts",
  };
  await prisma.learningProfile.upsert({
    where: { userId },
    create: { userId, currentFocus: JSON.stringify(payload) },
    update: { currentFocus: JSON.stringify(payload) },
  });
}

function isCompacted(raw: unknown): boolean {
  return Boolean(raw && typeof raw === "object" && (raw as { compacted?: boolean }).compacted);
}

async function compactListening(cutoff: Date) {
  const rows = await prisma.listeningSession.findMany({
    where: { createdAt: { lt: cutoff }, status: "submitted" },
    take: 80,
    select: { id: true, publicContent: true },
  });
  let compacted = 0;
  for (const row of rows) {
    if (isCompacted(row.publicContent)) {
      continue;
    }
    const content = (row.publicContent || {}) as {
      title?: string;
      titleZh?: string;
      examLabel?: string;
      format?: string;
    };
    await prisma.listeningSession.update({
      where: { id: row.id },
      data: {
        publicContent: {
          title: content.title || "",
          titleZh: content.titleZh || "",
          examLabel: content.examLabel || "",
          format: content.format || "",
          compacted: true,
          questions: [],
        },
        answerKey: { compacted: true },
        response: Prisma.JsonNull,
      },
    });
    compacted += 1;
  }
  return compacted;
}

async function compactExamPapers(cutoff: Date) {
  const rows = await prisma.examPaper.findMany({
    where: { createdAt: { lt: cutoff }, status: "submitted" },
    take: 80,
    select: { id: true, publicContent: true, examType: true, skill: true },
  });
  let compacted = 0;
  for (const row of rows) {
    if (isCompacted(row.publicContent)) {
      continue;
    }
    await prisma.examPaper.update({
      where: { id: row.id },
      data: {
        publicContent: {
          compacted: true,
          examType: row.examType,
          skill: row.skill,
        },
        answerKey: { compacted: true },
        response: Prisma.JsonNull,
      },
    });
    compacted += 1;
  }
  return compacted;
}

export type RetentionResult = {
  abandonedSessions: number;
  abandonedListening: number;
  abandonedPapers: number;
  messages: number;
  feedback: number;
  listeningCompacted: number;
  papersCompacted: number;
  masteredReviews: number;
  oldReviews: number;
  skillMetrics: number;
  oldSessions: number;
  oldListening: number;
  oldPapers: number;
};

export async function purgeExpiredData(): Promise<RetentionResult> {
  const abandonedAt = ago(ABANDONED_AFTER_MS);
  const bulkyAt = ago(BULKY_AFTER_MS);
  const keepAt = ago(KEEP_SUMMARY_MS);
  const masteredAt = ago(MASTERED_REVIEW_MS);

  const abandonedSessions = await prisma.practiceSession.deleteMany({
    where: { status: "in_progress", createdAt: { lt: abandonedAt } },
  });
  const abandonedListening = await prisma.listeningSession.deleteMany({
    where: { status: "in_progress", createdAt: { lt: abandonedAt } },
  });
  const abandonedPapers = await prisma.examPaper.deleteMany({
    where: { status: "in_progress", createdAt: { lt: abandonedAt } },
  });

  const messages = await prisma.conversationMessage.deleteMany({
    where: { createdAt: { lt: bulkyAt } },
  });
  const feedback = await prisma.languageFeedback.deleteMany({
    where: { createdAt: { lt: bulkyAt } },
  });

  const listeningCompacted = await compactListening(bulkyAt);
  const papersCompacted = await compactExamPapers(bulkyAt);

  const masteredReviews = await prisma.reviewItem.deleteMany({
    where: { status: ReviewStatus.mastered, updatedAt: { lt: masteredAt } },
  });
  const oldReviews = await prisma.reviewItem.deleteMany({
    where: { createdAt: { lt: keepAt } },
  });
  const skillMetrics = await prisma.skillMetric.deleteMany({
    where: { createdAt: { lt: keepAt } },
  });

  const oldSessionRows = await prisma.practiceSession.findMany({
    where: { createdAt: { lt: keepAt } },
    select: { userId: true },
    distinct: ["userId"],
  });
  for (const row of oldSessionRows) {
    await snapshotLatestFocus(row.userId);
  }
  const oldSessions = await prisma.practiceSession.deleteMany({
    where: { createdAt: { lt: keepAt } },
  });
  const oldListening = await prisma.listeningSession.deleteMany({
    where: { createdAt: { lt: keepAt } },
  });
  const oldPapers = await prisma.examPaper.deleteMany({
    where: { createdAt: { lt: keepAt } },
  });

  return {
    abandonedSessions: abandonedSessions.count,
    abandonedListening: abandonedListening.count,
    abandonedPapers: abandonedPapers.count,
    messages: messages.count,
    feedback: feedback.count,
    listeningCompacted,
    papersCompacted,
    masteredReviews: masteredReviews.count,
    oldReviews: oldReviews.count,
    skillMetrics: skillMetrics.count,
    oldSessions: oldSessions.count,
    oldListening: oldListening.count,
    oldPapers: oldPapers.count,
  };
}

export function scheduleRetentionPurge() {
  if (purging || Date.now() - lastPurgeAt < OPPORTUNISTIC_GAP_MS) {
    return;
  }
  purging = true;
  void purgeExpiredData()
    .then(() => {
      lastPurgeAt = Date.now();
    })
    .catch((error) => {
      console.error("自动清理过期练习数据失败", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    })
    .finally(() => {
      purging = false;
    });
}
