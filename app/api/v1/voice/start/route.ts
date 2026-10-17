import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/src/lib/auth/authOptions";
import { prisma } from "@/src/lib/db/prisma";
import { buildConversationPrompt } from "@/src/lib/ai/prompts";
import { buildExamTask } from "@/src/lib/exam/tasks";
import { readCoachNote } from "@/src/lib/general/coachNote";
import { generalScene } from "@/src/lib/general/scenes";
import { createRtcAccessToken } from "@/src/lib/volc/parseRtcToken";
import { startVoiceChat } from "@/src/lib/volc/startVoiceChat";

const bodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  voice: z.enum(["male", "female"]).optional(),
});

function createRoomId(): string {
  return `room${randomBytes(8).toString("hex")}`;
}

function createUserId(): string {
  return `user${randomBytes(8).toString("hex")}`;
}

function createTaskId(): string {
  return `task${randomBytes(8).toString("hex")}`;
}

/**
 * 生成独立房间，先让 SpeakMate 进房，再把进房凭证返回给浏览器。
 */
export async function POST(request: Request) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json(
      { success: false, error: "未登录" },
      { status: 401 }
    );
  }

  let sessionId = "";
  let voice: "male" | "female" = "male";
  const raw = await request.text();
  if (raw.trim()) {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { success: false, error: "JSON 解析错误：请求体必须是合法 JSON" },
        { status: 400 }
      );
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "练习编号无效" },
        { status: 400 }
      );
    }
    sessionId = parsed.data.sessionId || "";
    voice = parsed.data.voice || "male";
  }

  let welcomeMessage =
    "Hi! I'm SpeakMate, your English speaking partner. What would you like to talk about today?";
  let systemRole =
    "You are SpeakMate, a friendly English speaking partner. Speak natural English. Ask one question at a time. Do not give official IELTS or TOEFL scores.";

  if (sessionId) {
    const practice = await prisma.practiceSession.findFirst({
      where: { id: sessionId, userId: authSession.user.id },
      select: { id: true, mode: true, examType: true, topic: true, difficulty: true, feedbackMode: true },
    });
    if (!practice) {
      return NextResponse.json(
        { success: false, error: "练习不存在" },
        { status: 404 }
      );
    }
    let coachNote = "";
    try {
      coachNote = await readCoachNote(practice.id);
    } catch {
      coachNote = "";
    }
    if (practice.mode === "exam") {
      const script = buildExamTask(practice.examType || "", practice.topic || "", practice.id);
      if (!script) {
        return NextResponse.json(
          { success: false, error: "考试部分无效" },
          { status: 400 }
        );
      }
      welcomeMessage = script.welcome;
      systemRole = [script.systemRole, coachNote].filter(Boolean).join("\n");
    } else {
      const scene = generalScene(practice.topic, practice.difficulty);
      welcomeMessage = scene.welcome;
      systemRole = [
        buildConversationPrompt({
          mode: "general",
          topic: practice.topic,
          difficulty: practice.difficulty,
          feedbackMode: practice.feedbackMode,
          coachNote,
        }),
        `Your first line has already been spoken: "${scene.welcome}"`,
        "Do not greet again, and do not ask what they want to talk about. Continue this scene.",
      ].join("\n");
    }
  }

  const rtcAppId = process.env.VOLC_RTC_APP_ID?.trim() || "";
  const rtcAppKey = process.env.VOLC_RTC_APP_KEY?.trim() || "";
  if (!rtcAppId || !rtcAppKey) {
    return NextResponse.json(
      {
        success: false,
        error: "语音服务未配置，缺少 VOLC_RTC_APP_ID 或 VOLC_RTC_APP_KEY",
      },
      { status: 503 }
    );
  }

  const roomId = createRoomId();
  const userId = createUserId();
  const taskId = createTaskId();
  const expireAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  let token = "";
  try {
    token = createRtcAccessToken({
      appId: rtcAppId,
      appKey: rtcAppKey,
      roomId,
      userId,
      expireAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "进房 Token 生成失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const started = await startVoiceChat({
    roomId,
    userId,
    taskId,
    agentConfig: {
      userId: "SpeakMate",
      welcomeMessage,
      systemRole,
      speaker: voice,
    },
  });

  if (!started.success) {
    const status = started.error.includes("未配置") ? 503 : 502;
    return NextResponse.json(
      { success: false, error: started.error },
      { status }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      appId: rtcAppId,
      token,
      roomId,
      userId,
      taskId,
    },
  });
}
