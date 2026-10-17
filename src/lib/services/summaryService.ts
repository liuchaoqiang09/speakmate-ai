import { z } from "zod";
import { Prisma, ReviewStatus } from "@prisma/client";
import { callDeepSeek } from "@/src/lib/ai/deepseek";
import { buildSummaryPrompt } from "@/src/lib/ai/prompts";
import { examScoreKind } from "@/src/lib/exam/tasks";
import { prisma } from "@/src/lib/db/prisma";
import { normalizeBilingualNotes } from "@/src/lib/summary/bilingual";

const MIN_MESSAGES_FOR_AI = 2;

const bilingualNoteSchema = z.union([
  z.string().min(1),
  z.object({
    en: z.string().min(1),
    zh: z.string().optional(),
  }),
]);

const correctionSchema = z.object({
  original: z.string().min(1),
  original_zh: z.string().optional(),
  corrected: z.string().min(1),
  corrected_zh: z.string().optional(),
  category: z.enum(["grammar", "vocabulary", "collocation", "fluency"]),
  explanation: z.string().min(1),
  explanation_zh: z.string().optional(),
  natural: z.string().optional(),
  natural_zh: z.string().optional(),
  advanced: z.string().optional(),
  advanced_zh: z.string().optional(),
});

const usefulPhraseSchema = z.object({
  phrase: z.string().min(1),
  meaning_zh: z.string().min(1),
  example: z.string().min(1),
  example_zh: z.string().optional(),
});

export const summaryAiSchema = z.object({
  corrections: z.array(correctionSchema),
  useful_phrases: z.array(usefulPhraseSchema),
  strengths: z.array(bilingualNoteSchema),
  key_errors: z.array(bilingualNoteSchema),
  next_practice_focus: z.array(bilingualNoteSchema),
  goals_met: z.array(z.string()).optional(),
  model_answer: z.string().optional(),
  band_note: z.string().optional(),
  data_confidence: z.enum(["sufficient", "insufficient"]),
  reference_score: z.unknown().optional(),
  speaking_score: z.unknown().optional(),
  advice_en: z.string().optional(),
  advice_zh: z.string().optional(),
});

export type SummaryAiPayload = z.infer<typeof summaryAiSchema>;

export type ReferenceScore =
  | {
      kind: "ielts";
      fluencyCoherence: number;
      lexicalResource: number;
      grammaticalRange: number;
      overall: number;
      fluencyComment: string;
      lexicalComment: string;
      grammarComment: string;
      excludes: "pronunciation";
    }
  | {
      kind: "toefl_repeat" | "toefl_interview";
      taskScore: number;
      comment: string;
      topicComment: string;
      paceComment: string;
      languageComment: string;
      excludes: "pronunciation";
    };

function asHalfBand(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return null;
  }
  const rounded = Math.round(numberValue * 2) / 2;
  if (rounded < 0 || rounded > 9) {
    return null;
  }
  return rounded;
}

function asTaskScore(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return null;
  }
  const rounded = Math.round(numberValue);
  if (rounded < 0 || rounded > 5) {
    return null;
  }
  return rounded;
}

function textField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

export function readReferenceScore(raw: unknown, kind: string | null): ReferenceScore | null {
  if (!kind || !raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (kind === "ielts") {
    const fluency = asHalfBand(record.fluency_coherence);
    const lexical = asHalfBand(record.lexical_resource);
    const grammar = asHalfBand(record.grammatical_range);
    if (fluency === null || lexical === null || grammar === null) {
      return null;
    }
    return {
      kind: "ielts",
      fluencyCoherence: fluency,
      lexicalResource: lexical,
      grammaticalRange: grammar,
      overall: Math.round(((fluency + lexical + grammar) / 3) * 2) / 2,
      fluencyComment: textField(record, "fluency_comment"),
      lexicalComment: textField(record, "lexical_comment"),
      grammarComment: textField(record, "grammar_comment"),
      excludes: "pronunciation",
    };
  }

  const taskScore = asTaskScore(record.task_score);
  if (taskScore === null) {
    return null;
  }
  if (kind === "toefl_repeat") {
    return {
      kind: "toefl_repeat",
      taskScore,
      comment: textField(record, "comment"),
      topicComment: "",
      paceComment: "",
      languageComment: "",
      excludes: "pronunciation",
    };
  }
  if (kind === "toefl_interview") {
    return {
      kind: "toefl_interview",
      taskScore,
      comment: textField(record, "comment"),
      topicComment: textField(record, "topic_comment"),
      paceComment: textField(record, "pace_comment"),
      languageComment: textField(record, "language_comment"),
      excludes: "pronunciation",
    };
  }
  return null;
}

const summarySelect = {
  id: true,
  userId: true,
  sessionId: true,
  strengths: true,
  keyErrors: true,
  usefulPhrases: true,
  nextPracticeFocus: true,
  referenceScore: true,
  dataConfidence: true,
  createdAt: true,
} as const;

const feedbackSelect = {
  id: true,
  sessionId: true,
  category: true,
  originalText: true,
  originalZh: true,
  correctedText: true,
  correctedZh: true,
  explanation: true,
  explanationZh: true,
  severity: true,
  createdAt: true,
} as const;

function packUpgrades(item: {
  natural?: string;
  natural_zh?: string;
  advanced?: string;
  advanced_zh?: string;
}): string | null {
  const payload = {
    natural: item.natural?.trim() || "",
    naturalZh: item.natural_zh?.trim() || "",
    advanced: item.advanced?.trim() || "",
    advancedZh: item.advanced_zh?.trim() || "",
  };
  if (!payload.natural && !payload.advanced) {
    return null;
  }
  return JSON.stringify(payload);
}

function emptyInsufficientPayload(): SummaryAiPayload {
  return {
    corrections: [],
    useful_phrases: [],
    strengths: [],
    key_errors: [],
    next_practice_focus: [],
    data_confidence: "insufficient",
    reference_score: null,
    advice_en: "Speak a little longer next time so we can score grammar, vocabulary, and how fully you answer.",
    advice_zh: "下次多说几轮。说太短时无法按完整度、语法、词汇和互动来给建议。",
  };
}

/**
 * 有限恢复：允许从 markdown 代码块中取出 JSON，但不补造字段。
 */
function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fenced?.[1]) {
      throw new Error("PARSE_ERROR");
    }
    return JSON.parse(fenced[1].trim());
  }
}

async function findOwnedSession(sessionId: string, userId: string) {
  return prisma.practiceSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
      userId: true,
      mode: true,
      examType: true,
      topic: true,
      difficulty: true,
      feedbackMode: true,
      durationSeconds: true,
      status: true,
    },
  });
}

async function loadSummaryBundle(sessionId: string, userId: string) {
  const summary = await prisma.sessionSummary.findFirst({
    where: { sessionId, userId },
    select: summarySelect,
  });

  if (!summary) {
    return null;
  }

  const feedback = await prisma.languageFeedback.findMany({
    where: { sessionId, userId },
    orderBy: { createdAt: "asc" },
    select: feedbackSelect,
  });

  return { summary, feedback };
}

function studyRecord(payload: SummaryAiPayload, referenceScore: ReferenceScore | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const modelAnswer = payload.model_answer?.trim() || "";
  const bandNote = payload.band_note?.trim() || "";
  const goalsMet = (payload.goals_met || []).map((item) => item.trim()).filter(Boolean);
  const adviceEn = payload.advice_en?.trim() || "";
  const adviceZh = payload.advice_zh?.trim() || "";
  const speaking =
    payload.speaking_score && typeof payload.speaking_score === "object"
      ? payload.speaking_score
      : null;
  if (!referenceScore && !modelAnswer && !bandNote && goalsMet.length === 0 && !speaking && !adviceEn && !adviceZh) {
    return Prisma.DbNull;
  }
  return {
    ...(referenceScore || { kind: "speaking" }),
    speaking,
    adviceEn,
    adviceZh,
    advice_en: adviceEn,
    advice_zh: adviceZh,
    modelAnswer,
    bandNote,
    goalsMet,
  };
}

async function saveSummary(
  sessionId: string,
  userId: string,
  payload: SummaryAiPayload,
  referenceScore: ReferenceScore | null
) {
  const summary = await prisma.$transaction(async (tx) => {
    const created = await tx.sessionSummary.create({
      data: {
        userId,
        sessionId,
        strengths: normalizeBilingualNotes(payload.strengths),
        keyErrors: normalizeBilingualNotes(payload.key_errors),
        usefulPhrases: payload.useful_phrases,
        nextPracticeFocus: normalizeBilingualNotes(payload.next_practice_focus),
        referenceScore: studyRecord(payload, referenceScore),
        dataConfidence: payload.data_confidence,
      },
      select: summarySelect,
    });

    if (payload.corrections.length > 0) {
      await tx.languageFeedback.createMany({
        data: payload.corrections.map((item) => ({
          userId,
          sessionId,
          category: item.category,
          originalText: item.original,
          originalZh: item.original_zh?.trim() || null,
          correctedText: item.corrected,
          correctedZh: item.corrected_zh?.trim() || null,
          explanation: item.explanation,
          explanationZh: item.explanation_zh?.trim() || null,
          severity: packUpgrades(item),
        })),
      });
    }

    const dueAt = new Date(Date.now() + 20 * 60 * 60 * 1000);
    const reviewRows = payload.corrections.slice(0, 6).map((item) => ({
      userId,
      itemType: item.category,
      prompt: item.original.trim(),
      expectedAnswer: (item.natural || item.corrected).trim(),
      status: ReviewStatus.pending,
      dueAt,
    }));
    if (reviewRows.length > 0) {
      await tx.reviewItem.createMany({ data: reviewRows });
    }

    return created;
  });

  const feedback = await prisma.languageFeedback.findMany({
    where: { sessionId, userId },
    orderBy: { createdAt: "asc" },
    select: feedbackSelect,
  });

  return { summary, feedback };
}

export async function getSummary(sessionId: string, userId: string) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    return {
      success: false as const,
      error: "练习不存在",
      status: 404,
    };
  }

  let bundle = await loadSummaryBundle(sessionId, userId);
  if (!bundle) {
    const generated = await generateSummary(sessionId, userId);
    if (!generated.success) {
      return generated;
    }
    bundle = generated.data;
  }

  const turnCount = await prisma.conversationMessage.count({
    where: { sessionId, userId },
  });

  return {
    success: true as const,
    data: {
      ...bundle,
      summary: {
        ...bundle.summary,
        topic: session.topic,
        difficulty: session.difficulty,
        examType: session.examType,
        mode: session.mode,
        durationSeconds: session.durationSeconds,
        turnCount,
      },
    },
  };
}

export async function generateSummary(sessionId: string, userId: string) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    return {
      success: false as const,
      error: "练习不存在",
      status: 404,
    };
  }

  const existing = await loadSummaryBundle(sessionId, userId);
  if (existing) {
    return { success: true as const, data: existing };
  }

  const messages = await prisma.conversationMessage.findMany({
    where: { sessionId, userId },
    orderBy: { sequenceNumber: "asc" },
    select: {
      role: true,
      contentText: true,
    },
  });

  if (messages.length < MIN_MESSAGES_FOR_AI) {
    try {
      const bundle = await saveSummary(
        sessionId,
        userId,
        emptyInsufficientPayload(),
        null
      );
      return { success: true as const, data: bundle };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const bundle = await loadSummaryBundle(sessionId, userId);
        if (bundle) {
          return { success: true as const, data: bundle };
        }
      }
      console.error("保存数据不足的总结失败", {
        sessionId,
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return {
        success: false as const,
        error: "保存总结失败",
        status: 500,
      };
    }
  }

  const prompt = buildSummaryPrompt(messages, {
    mode: session.mode,
    topic: session.topic,
    difficulty: session.difficulty,
    examType: session.examType,
    feedbackMode: session.feedbackMode,
  });

  const aiResult = await callDeepSeek(
    [
      {
        role: "system",
        content:
          "Return only valid JSON that matches the requested schema. No markdown.",
      },
      { role: "user", content: prompt },
    ],
    { timeoutMs: 60_000 }
  );

  if (!aiResult.success || !aiResult.data) {
    console.error("生成练习总结时 DeepSeek 调用失败", { sessionId });
    return {
      success: false as const,
      error: aiResult.error || "总结生成失败",
      status: 502,
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = parseModelJson(aiResult.data.content);
  } catch {
    console.error("练习总结 JSON 解析失败", { sessionId });
    return {
      success: false as const,
      error: "JSON 解析错误：总结内容不是合法 JSON",
      status: 502,
    };
  }

  const parsed = summaryAiSchema.safeParse(parsedJson);
  if (!parsed.success) {
    console.error("练习总结结构校验失败", {
      sessionId,
      issueCount: parsed.error.issues.length,
    });
    return {
      success: false as const,
      error: "总结结构无效，未写入数据库",
      status: 502,
    };
  }

  const scoreKind =
    session.mode === "exam" ? examScoreKind(session.examType || "", session.topic || "") : null;
  const referenceScore =
    parsed.data.data_confidence === "sufficient"
      ? readReferenceScore(parsed.data.reference_score, scoreKind)
      : null;
  if (parsed.data.data_confidence === "sufficient" && scoreKind && !referenceScore) {
    console.error("考试参考分结构不完整，仍保存会话总结", { sessionId, scoreKind });
  }

  try {
    const bundle = await saveSummary(sessionId, userId, parsed.data, referenceScore);
    return { success: true as const, data: bundle };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const bundle = await loadSummaryBundle(sessionId, userId);
      if (bundle) {
        return { success: true as const, data: bundle };
      }
    }
    console.error("保存练习总结失败", {
      sessionId,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false as const,
      error: "保存总结失败",
      status: 500,
    };
  }
}
