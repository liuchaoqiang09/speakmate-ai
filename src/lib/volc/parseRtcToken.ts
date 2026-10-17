import { createHmac, randomBytes } from "crypto";
import { readRtcAccessToken, type RtcTokenClaims } from "@/src/lib/volc/readRtcToken";

const VERSION = "001";
const APP_ID_LENGTH = 24;
const publishPrivilege = 0;
const subscribePrivilege = 4;

export type { RtcTokenClaims };

/** @deprecated 请使用 readRtcAccessToken。保留此导出名以兼容已有调用。 */
export function parseRtcAccessToken(raw: string): {
  appId: string;
  roomId: string;
  userId: string;
} | null {
  const claims = readRtcAccessToken(raw);
  if (!claims) {
    return null;
  }
  return {
    appId: claims.appId,
    roomId: claims.roomId,
    userId: claims.userId,
  };
}

class ByteBuf {
  private buffer = Buffer.alloc(1024);
  private position = 0;

  putUint16(value: number): this {
    this.buffer.writeUInt16LE(value, this.position);
    this.position += 2;
    return this;
  }

  putUint32(value: number): this {
    this.buffer.writeUInt32LE(value >>> 0, this.position);
    this.position += 4;
    return this;
  }

  putBytes(bytes: Buffer): this {
    this.putUint16(bytes.length);
    bytes.copy(this.buffer, this.position);
    this.position += bytes.length;
    return this;
  }

  putString(value: string): this {
    return this.putBytes(Buffer.from(value));
  }

  /**
   * 与官方 token.js 的 putTreeMapUInt32 一致。
   * 数字键在 JavaScript 对象里按 0、1、2、3、4 的顺序写出。
   */
  putPrivilegeMap(privileges: Record<number, number>): this {
    const keys = Object.keys(privileges);
    this.putUint16(keys.length);
    for (const key of keys) {
      this.putUint16(Number(key));
      this.putUint32(privileges[Number(key)]);
    }
    return this;
  }

  pack(): Buffer {
    return Buffer.from(this.buffer.subarray(0, this.position));
  }
}

function addPrivilege(
  privileges: Record<number, number>,
  privilege: number,
  expireTimestamp: number
) {
  privileges[privilege] = expireTimestamp;
  if (privilege === publishPrivilege) {
    privileges[2] = expireTimestamp;
    privileges[1] = expireTimestamp;
    privileges[3] = expireTimestamp;
  }
}

function packMessage(input: {
  nonce: number;
  issuedAt: number;
  expireAt: number;
  roomId: string;
  userId: string;
  privileges: Record<number, number>;
}): Buffer {
  const message = new ByteBuf();
  message.putUint32(input.nonce);
  message.putUint32(input.issuedAt);
  message.putUint32(input.expireAt);
  message.putString(input.roomId);
  message.putString(input.userId);
  message.putPrivilegeMap(input.privileges);
  return message.pack();
}

/**
 * 用 AI 音视频互动应用的 AppId / AppKey 签发客户端进房 Token。
 * 发布和订阅权限的过期时间与 Token 本身相同。
 * Web SDK 4.60 之后如果控制台打开了连麦鉴权，权限时间写成 0 会报 token_error。
 */
export function createRtcAccessToken(input: {
  appId: string;
  appKey: string;
  roomId: string;
  userId: string;
  expireAt: number;
}): string {
  const appId = input.appId.trim();
  const appKey = input.appKey.trim();
  const roomId = input.roomId.trim();
  const userId = input.userId.trim();

  if (appId.length !== APP_ID_LENGTH) {
    throw new Error("VOLC_RTC_APP_ID 必须是 24 位");
  }
  if (!appKey || !roomId || !userId) {
    throw new Error("生成进房 Token 缺少 AppKey、房间号或用户号");
  }

  const now = Math.floor(Date.now() / 1000);
  if (input.expireAt <= now) {
    throw new Error("进房 Token 过期时间无效");
  }

  const privileges: Record<number, number> = {};
  addPrivilege(privileges, subscribePrivilege, input.expireAt);
  addPrivilege(privileges, publishPrivilege, input.expireAt);

  const message = packMessage({
    nonce: randomBytes(4).readUInt32LE(0),
    issuedAt: now,
    expireAt: input.expireAt,
    roomId,
    userId,
    privileges,
  });
  const signature = createHmac("sha256", appKey).update(message).digest();
  const content = new ByteBuf().putBytes(message).putBytes(signature).pack();
  const token = `${VERSION}${appId}${content.toString("base64")}`;

  const claims = readRtcAccessToken(token);
  if (
    !claims ||
    claims.appId !== appId ||
    claims.roomId !== roomId ||
    claims.userId !== userId ||
    claims.expireAt !== input.expireAt
  ) {
    throw new Error("进房 Token 生成后校验失败");
  }

  return token;
}
