import { PracticeMode, PracticeStatus, Prisma } from "@prisma/client";
import { callDeepSeek } from "@/src/lib/ai/deepseek";
import { buildConversationPrompt } from "@/src/lib/ai/prompts";
import { prisma } from "@/src/lib/db/prisma";
import { readCoachNote, saveCoachNote } from "@/src/lib/general/coachNote";
import { generalScene } from "@/src/lib/general/scenes";

const MAX_HISTORY_MESSAGES = 20;

export type CreateSessionInput = {
  mode: "general" | "exam";
  examType?: string | null;
  topic: string;
  difficulty?: string | null;
  feedbackMode?: string | null;
  sceneDialogue?: boolean;
  coachNote?: string | null;
};

const sessionSelect = {
  id: true,
  userId: true,
  mode: true,
  examType: true,
  topic: true,
  difficulty: true,
  feedbackMode: true,
  startedAt: true,
  endedAt: true,
  durationSeconds: true,
  status: true,
  createdAt: true,
} as const;

const messageSelect = {
  id: true,
  sessionId: true,
  userId: true,
  role: true,
  contentText: true,
  sequenceNumber: true,
  createdAt: true,
} as const;

function toPracticeMode(mode: "general" | "exam"): PracticeMode {
  return mode === "exam" ? PracticeMode.exam : PracticeMode.general;
}

async function findOwnedSession(sessionId: string, userId: string) {
  return prisma.practiceSession.findFirst({
    where: { id: sessionId, userId },
    select: sessionSelect,
  });
}

export async function createSession(userId: string, input: CreateSessionInput) {
  try {
    const topic = input.topic.trim();
    const created = await prisma.$transaction(async (tx) => {
      const session = await tx.practiceSession.create({
        data: {
          userId,
          mode: toPracticeMode(input.mode),
          examType: input.examType?.trim() || null,
          topic,
          difficulty: input.difficulty?.trim() || null,
          feedbackMode: input.feedbackMode?.trim() || null,
          status: PracticeStatus.in_progress,
        },
        select: sessionSelect,
      });

      if (input.mode !== "general" || !input.sceneDialogue) {
        return { session, opening: null };
      }

      const opening = await tx.conversationMessage.create({
        data: {
          sessionId: session.id,
          userId,
          role: "assistant",
          contentText: generalScene(topic).welcome,
          sequenceNumber: 1,
        },
        select: messageSelect,
      });

      return { session, opening };
    });

    if (input.coachNote?.trim()) {
      try {
        await saveCoachNote(created.session.id, input.coachNote);
      } catch (noteError) {
        console.error("保存本轮重点失败", {
          name: noteError instanceof Error ? noteError.name : "UnknownError",
        });
      }
    }

    return { success: true as const, data: created };
  } catch (error) {
    console.error("创建练习会话失败", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false as const,
      error: "创建练习失败，请稍后重试",
      status: 500,
    };
  }
}

export async function getSessionWithMessages(sessionId: string, userId: string) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    return {
      success: false as const,
      error: "练习不存在",
      status: 404,
    };
  }

  const messages = await prisma.conversationMessage.findMany({
    where: { sessionId, userId },
    orderBy: { sequenceNumber: "asc" },
    select: messageSelect,
  });

  return {
    success: true as const,
    data: { session, messages },
  };
}

export async function addMessage(
  sessionId: string,
  userId: string,
  userContent: string
) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    return {
      success: false as const,
      error: "练习不存在",
      status: 404,
    };
  }

  if (session.status !== PracticeStatus.in_progress) {
    return {
      success: false as const,
      error: "该练习已结束，不能继续发送消息",
      status: 409,
    };
  }

  const history = await prisma.conversationMessage.findMany({
    where: { sessionId, userId },
    orderBy: { sequenceNumber: "asc" },
    select: {
      role: true,
      contentText: true,
      sequenceNumber: true,
    },
  });

  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
  let coachNote = "";
  try {
    coachNote = await readCoachNote(sessionId);
  } catch {
    coachNote = "";
  }
  const prompt = buildConversationPrompt({
    mode: session.mode,
    examType: session.examType,
    topic: session.topic,
    difficulty: session.difficulty,
    feedbackMode: session.feedbackMode,
    coachNote,
  });

  const aiMessages = [
    { role: "system", content: prompt },
    ...recentHistory.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.contentText,
    })),
    { role: "user", content: userContent },
  ];

  const aiResult = await callDeepSeek(aiMessages);
  if (!aiResult.success || !aiResult.data) {
    console.error("练习对话调用 DeepSeek 失败", {
      sessionId,
      status: session.status,
    });
    return {
      success: false as const,
      error: aiResult.error || "AI 回复失败",
      status: 502,
    };
  }

  const lastSequence = history[history.length - 1]?.sequenceNumber ?? 0;

  try {
    const [userMessage, assistantMessage] = await prisma.$transaction([
      prisma.conversationMessage.create({
        data: {
          sessionId,
          userId,
          role: "user",
          contentText: userContent,
          sequenceNumber: lastSequence + 1,
        },
        select: messageSelect,
      }),
      prisma.conversationMessage.create({
        data: {
          sessionId,
          userId,
          role: "assistant",
          contentText: aiResult.data.content,
          sequenceNumber: lastSequence + 2,
        },
        select: messageSelect,
      }),
    ]);

    return {
      success: true as const,
      data: { userMessage, assistantMessage },
    };
  } catch (error) {
    console.error("保存练习消息失败", {
      sessionId,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false as const,
      error: "保存对话失败，请稍后重试",
      status: 500,
    };
  }
}

/**
 * 写入一条语音字幕。不调用 DeepSeek，回复文本来自火山实时对话。
 */
export async function saveVoiceMessage(
  sessionId: string,
  userId: string,
  role: "user" | "assistant",
  contentText: string
) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    return {
      success: false as const,
      error: "练习不存在",
      status: 404,
    };
  }

  if (session.status !== PracticeStatus.in_progress) {
    return {
      success: false as const,
      error: "该练习已结束，不能继续保存字幕",
      status: 409,
    };
  }

  try {
    const message = await prisma.$transaction(async (tx) => {
      const latest = await tx.conversationMessage.findFirst({
        where: { sessionId },
        orderBy: { sequenceNumber: "desc" },
        select: { sequenceNumber: true },
      });
      const sequenceNumber = (latest?.sequenceNumber ?? 0) + 1;
      return tx.conversationMessage.create({
        data: {
          sessionId,
          userId,
          role,
          contentText,
          sequenceNumber,
        },
        select: messageSelect,
      });
    });

    return { success: true as const, data: { message } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      try {
        const message = await prisma.$transaction(async (tx) => {
          const latest = await tx.conversationMessage.findFirst({
            where: { sessionId },
            orderBy: { sequenceNumber: "desc" },
            select: { sequenceNumber: true },
          });
          return tx.conversationMessage.create({
            data: {
              sessionId,
              userId,
              role,
              contentText,
              sequenceNumber: (latest?.sequenceNumber ?? 0) + 1,
            },
            select: messageSelect,
          });
        });
        return { success: true as const, data: { message } };
      } catch (retryError) {
        console.error("重试保存语音字幕失败", {
          sessionId,
          name: retryError instanceof Error ? retryError.name : "UnknownError",
        });
      }
    }

    console.error("保存语音字幕失败", {
      sessionId,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false as const,
      error: "保存对话失败，请稍后重试",
      status: 500,
    };
  }
}

export async function endSession(sessionId: string, userId: string) {
  const session = await findOwnedSession(sessionId, userId);
  if (!session) {
    return {
      success: false as const,
      error: "练习不存在",
      status: 404,
    };
  }

  if (session.status === PracticeStatus.completed && session.endedAt) {
    return { success: true as const, data: { session } };
  }

  const endedAt = new Date();
  const durationSeconds = Math.max(
    0,
    Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000)
  );

  const updated = await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      status: PracticeStatus.completed,
      endedAt,
      durationSeconds,
    },
    select: sessionSelect,
  });

  return { success: true as const, data: { session: updated } };
}
