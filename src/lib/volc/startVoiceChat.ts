import { randomBytes } from "crypto";
import { callVolcApi } from "@/src/lib/volc/rtcClient";
import { resolveSpeaker } from "@/src/lib/volc/voices";

const ROOM_PREFIX = "r";
const SESSION_HEX_LENGTH = 32;
const ROOM_RANDOM_HEX_LENGTH = 16;

/**
 * 房间号里带上练习编号，停房时才能确认这个房间属于哪一次练习。
 * 随机后缀避免别人只凭练习编号猜出房间号。
 */
export function createOwnedRoomId(sessionId: string): string {
  const compact = sessionId.replace(/-/g, "").toLowerCase();
  return `${ROOM_PREFIX}${compact}${randomBytes(8).toString("hex")}`;
}

export function sessionIdFromRoomId(roomId: string): string | null {
  if (!new RegExp(`^${ROOM_PREFIX}[0-9a-f]{${SESSION_HEX_LENGTH + ROOM_RANDOM_HEX_LENGTH}}$`, "i").test(roomId)) {
    return null;
  }
  const compact = roomId.slice(ROOM_PREFIX.length, ROOM_PREFIX.length + SESSION_HEX_LENGTH).toLowerCase();
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

const VOICE_CHAT_VERSION = "2025-06-01";
const DEFAULT_WELCOME =
  "Hi! I'm SpeakMate, your English speaking partner. What would you like to talk about today?";

export type VoiceAgentConfig = {
  /** 智能体在 RTC 房间里的用户 ID，不能和真人用户相同。 */
  userId: string;
  welcomeMessage?: string;
  systemRole?: string;
  speaker?: string;
};

export type StartVoiceChatInput = {
  roomId: string;
  userId: string;
  taskId: string;
  agentConfig: VoiceAgentConfig;
};

type VoiceChatEnv = {
  rtcAppId: string;
  speechAppId: string;
  speechToken: string;
};

function readVoiceEnv(): VoiceChatEnv | { error: string } {
  const rtcAppId = process.env.VOLC_RTC_APP_ID?.trim() || "";
  const speechAppId = process.env.VOLC_APP_ID?.trim() || "";
  const speechToken = process.env.VOLC_ACCESS_TOKEN?.trim() || "";
  const missing = [
    ["VOLC_RTC_APP_ID", rtcAppId],
    ["VOLC_APP_ID", speechAppId],
    ["VOLC_ACCESS_TOKEN", speechToken],
    ["VOLC_ACCESS_KEY_ID", process.env.VOLC_ACCESS_KEY_ID?.trim() || ""],
    ["VOLC_SECRET_ACCESS_KEY", process.env.VOLC_SECRET_ACCESS_KEY?.trim() || ""],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    return { error: `语音服务未配置，缺少 ${missing.join("、")}` };
  }

  return { rtcAppId, speechAppId, speechToken };
}

function errorMessage(action: "start" | "stop", code?: string, message?: string): string {
  const detail = [code, message].filter(Boolean).join("：");
  if (action === "stop") {
    return detail ? `停止语音智能体失败：${detail}` : "停止语音智能体失败";
  }
  return detail ? `启动语音智能体失败：${detail}` : "启动语音智能体失败";
}

/**
 * 调用 StartVoiceChat，让豆包端到端语音模型进入指定 RTC 房间。
 */
export async function startVoiceChat(input: StartVoiceChatInput): Promise<
  { success: true } | { success: false; error: string }
> {
  const env = readVoiceEnv();
  if ("error" in env) {
    return { success: false, error: env.error };
  }

  const speaker = resolveSpeaker(input.agentConfig.speaker);
  const welcome = input.agentConfig.welcomeMessage?.trim() || DEFAULT_WELCOME;
  const systemRole =
    input.agentConfig.systemRole?.trim() ||
    "You are SpeakMate, a friendly English speaking partner. Speak natural English. Ask one question at a time. Feedback is study advice, not an official exam score.";

  const body = {
    AppId: env.rtcAppId,
    RoomId: input.roomId,
    TaskId: input.taskId,
    AgentConfig: {
      UserId: input.agentConfig.userId,
      TargetUserId: [input.userId],
      WelcomeMessage: welcome,
      EnableConversationStateCallback: true,
    },
    Config: {
      S2SConfig: {
        Provider: "volcano",
        OutputMode: 0,
        ProviderParams: {
          app: {
            appid: env.speechAppId,
            token: env.speechToken,
          },
          tts: {
            speaker,
          },
          audio: {
            voice_type: speaker,
          },
          dialog: {
            bot_name: "SpeakMate",
            system_role: systemRole,
            speaking_style: "Clear, friendly, and concise.",
            extra: {
              model: "1.2.1.1",
            },
          },
        },
      },
    },
  };

  try {
    const result = await callVolcApi("StartVoiceChat", VOICE_CHAT_VERSION, body);
    const apiError = result.ResponseMetadata?.Error;
    if (apiError) {
      return {
        success: false,
        error: errorMessage("start", apiError.Code, apiError.Message),
      };
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络错误";
    return { success: false, error: `启动语音智能体失败：${message}` };
  }
}

export type StopVoiceChatInput = {
  roomId: string;
  taskId: string;
};

/**
 * 立刻结束豆包语音任务，避免人走了房间还在计费。
 */
export async function stopVoiceChat(input: StopVoiceChatInput): Promise<
  { success: true } | { success: false; error: string }
> {
  const env = readVoiceEnv();
  if ("error" in env) {
    return { success: false, error: env.error };
  }

  const body = {
    AppId: env.rtcAppId,
    RoomId: input.roomId,
    TaskId: input.taskId,
  };

  try {
    const result = await callVolcApi("StopVoiceChat", VOICE_CHAT_VERSION, body);
    const apiError = result.ResponseMetadata?.Error;
    if (apiError) {
      const blob = `${apiError.Code || ""} ${apiError.Message || ""}`;
      if (/not found|not exist|does not exist|TaskNotExist/i.test(blob)) {
        return { success: true };
      }
      return {
        success: false,
        error: errorMessage("stop", apiError.Code, apiError.Message),
      };
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络错误";
    return { success: false, error: `停止语音智能体失败：${message}` };
  }
}
