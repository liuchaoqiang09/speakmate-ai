import { createHash, createHmac } from "crypto";

const VOLC_ENDPOINT = "https://rtc.volcengineapi.com";
const VOLC_REGION = "cn-north-1";
const VOLC_SERVICE = "rtc";

export type VolcApiResult = {
  ResponseMetadata?: {
    RequestId?: string;
    Action?: string;
    Error?: {
      Code?: string;
      Message?: string;
    };
  };
  Result?: unknown;
};

function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function formatAmzDate(date: Date): string {
  const year = date.getUTCFullYear().toString();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function canonicalQuery(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(params[key])}`)
    .join("&");
}

function readCredentials(): { accessKeyId: string; secretAccessKey: string } {
  const accessKeyId = process.env.VOLC_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = process.env.VOLC_SECRET_ACCESS_KEY?.trim() || "";
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("缺少 VOLC_ACCESS_KEY_ID 或 VOLC_SECRET_ACCESS_KEY");
  }
  return { accessKeyId, secretAccessKey };
}

/**
 * 调用火山 OpenAPI。签名只在服务端计算，不记录 AK/SK。
 */
export async function callVolcApi(
  action: string,
  version: string,
  body: unknown
): Promise<VolcApiResult> {
  const { accessKeyId, secretAccessKey } = readCredentials();
  const payload = JSON.stringify(body);
  const payloadHash = sha256Hex(payload);
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = new URL(VOLC_ENDPOINT).host;
  const query = canonicalQuery({ Action: action, Version: version });

  const canonicalHeaders = [
    `content-type:application/json`,
    `host:${host}`,
    `x-content-sha256:${payloadHash}`,
    `x-date:${amzDate}`,
  ].join("\n");
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalRequest = [
    "POST",
    "/",
    query,
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${VOLC_REGION}/${VOLC_SERVICE}/request`;
  const stringToSign = [
    "HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(secretAccessKey, dateStamp), VOLC_REGION), VOLC_SERVICE),
    "request"
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");
  const authorization = `HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`${VOLC_ENDPOINT}?${query}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      Host: host,
      "X-Date": amzDate,
      "X-Content-Sha256": payloadHash,
    },
    body: payload,
  });

  const text = await response.text();
  try {
    return JSON.parse(text) as VolcApiResult;
  } catch {
    throw new Error(`火山接口返回的不是 JSON，HTTP ${response.status}`);
  }
}
