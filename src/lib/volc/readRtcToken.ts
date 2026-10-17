const VERSION = "001";
const APP_ID_LENGTH = 24;

export type RtcTokenClaims = {
  appId: string;
  roomId: string;
  userId: string;
  expireAt: number;
};

function decodeBase64(value: string): Uint8Array | null {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const input = `${normalized}${padding}`;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input)) {
    return null;
  }

  const bytes: number[] = [];
  for (let index = 0; index < input.length; index += 4) {
    const chunk = input.slice(index, index + 4);
    const values = chunk.split("").map((char) => {
      if (char === "=") {
        return 0;
      }
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(char);
    });
    if (values.some((item) => item < 0)) {
      return null;
    }
    bytes.push((values[0] << 2) | (values[1] >> 4));
    if (chunk[2] !== "=") {
      bytes.push(((values[1] & 15) << 4) | (values[2] >> 2));
    }
    if (chunk[3] !== "=") {
      bytes.push(((values[2] & 3) << 6) | values[3]);
    }
  }
  return Uint8Array.from(bytes);
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function readText(bytes: Uint8Array): string {
  let text = "";
  for (let index = 0; index < bytes.length; index += 1) {
    text += String.fromCharCode(bytes[index]);
  }
  return text;
}

/**
 * 读出进房 Token 里的 AppId、房间号和用户号。
 * 不校验签名，也不接触 AppKey，浏览器和服务端都可以调用。
 */
export function readRtcAccessToken(raw: string): RtcTokenClaims | null {
  const token = raw.trim();
  if (!token.startsWith(VERSION) || token.length <= VERSION.length + APP_ID_LENGTH) {
    return null;
  }

  const appId = token.slice(VERSION.length, VERSION.length + APP_ID_LENGTH);
  const content = decodeBase64(token.slice(VERSION.length + APP_ID_LENGTH));
  if (!content || content.length < 4) {
    return null;
  }

  const messageLength = readUint16(content, 0);
  const messageEnd = 2 + messageLength;
  if (messageLength <= 0 || messageEnd + 2 > content.length) {
    return null;
  }

  const message = content.subarray(2, messageEnd);
  if (message.length < 14) {
    return null;
  }

  const expireAt = readUint32(message, 8);
  let offset = 12;
  const roomLength = readUint16(message, offset);
  offset += 2;
  if (offset + roomLength > message.length) {
    return null;
  }
  const roomId = readText(message.subarray(offset, offset + roomLength));
  offset += roomLength;

  if (offset + 2 > message.length) {
    return null;
  }
  const userLength = readUint16(message, offset);
  offset += 2;
  if (offset + userLength > message.length) {
    return null;
  }
  const userId = readText(message.subarray(offset, offset + userLength));

  if (!appId || !roomId || !userId) {
    return null;
  }

  return { appId, roomId, userId, expireAt };
}
