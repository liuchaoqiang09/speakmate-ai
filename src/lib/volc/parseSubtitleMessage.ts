/**
 * 火山「AI 音视频互动方案」的实时字幕。
 *
 * Web SDK 没有单独的 subtitle 事件。字幕走房间二进制广播
 * `onRoomBinaryMessageReceived`（`@volcengine/rtc` 的 EngineEventsTypes）。
 * 前 4 字节魔数是 `subv`，随后 4 字节大端长度，其余是 JSON。
 * `definite === true` 表示这一句已经确定，中间结果为 false。
 * 同一条回调里魔数 `conv` 是智能体状态，不是字幕。
 */

export type VoiceSubtitleLine = {
  text: string;
  userId: string;
  sequence: number;
  definite: boolean;
  paragraph: boolean;
  roundId: number | null;
  language: string;
};

const SUBTITLE_MAGIC = "subv";

function readMagic(bytes: Uint8Array): string {
  if (bytes.byteLength < 4) {
    return "";
  }
  return String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
}

function readLine(value: unknown): VoiceSubtitleLine | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  const userId = typeof record.userId === "string" ? record.userId.trim() : "";
  const sequence = record.sequence;
  if (!text || !userId || typeof sequence !== "number" || !Number.isFinite(sequence)) {
    return null;
  }

  const roundId =
    typeof record.roundId === "number" && Number.isFinite(record.roundId)
      ? record.roundId
      : null;

  return {
    text,
    userId,
    sequence,
    definite: record.definite === true,
    paragraph: record.paragraph === true,
    roundId,
    language: typeof record.language === "string" ? record.language : "",
  };
}

function toArrayBuffer(message: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (message instanceof ArrayBuffer) {
    return message;
  }
  return message.buffer.slice(
    message.byteOffset,
    message.byteOffset + message.byteLength
  ) as ArrayBuffer;
}

/**
 * 解析一帧房间二进制消息。不是字幕帧时返回 null。
 */
export function parseRoomBinarySubtitle(
  message: ArrayBuffer | ArrayBufferView
): VoiceSubtitleLine[] | null {
  if (message == null || typeof message !== "object" || !("byteLength" in message)) {
    return null;
  }
  if (message.byteLength < 8) {
    return null;
  }

  const buffer = toArrayBuffer(message);
  const bytes = new Uint8Array(buffer);
  if (readMagic(bytes) !== SUBTITLE_MAGIC) {
    return null;
  }

  const length = new DataView(buffer).getUint32(4, false);
  if (length <= 0 || 8 + length > buffer.byteLength) {
    return null;
  }

  let payload: unknown;
  try {
    const json = new TextDecoder().decode(bytes.subarray(8, 8 + length));
    payload = JSON.parse(json);
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (record.type !== "subtitle" || !Array.isArray(record.data)) {
    return null;
  }

  const lines: VoiceSubtitleLine[] = [];
  for (const item of record.data) {
    const line = readLine(item);
    if (line) {
      lines.push(line);
    }
  }

  return lines;
}
