const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 8;
const MAX_PER_IP = 20;

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 2000) {
    return;
  }
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  });
}

function readCount(key: string, now: number): number {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    return 0;
  }
  return bucket.count;
}

function bump(key: string, now: number) {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function clientIpFromHeaders(headers: Headers | Record<string, unknown> | undefined): string {
  const read = (name: string): string => {
    if (!headers) {
      return "";
    }
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name) || "";
    }
    const record = headers as Record<string, unknown>;
    const raw = record[name] ?? record[name.toLowerCase()];
    if (Array.isArray(raw)) {
      return typeof raw[0] === "string" ? raw[0] : "";
    }
    return typeof raw === "string" ? raw : "";
  };
  const forwarded = read("x-forwarded-for").split(",")[0]?.trim();
  return forwarded || read("x-real-ip").trim() || "unknown";
}

export function tooManyAuthAttempts(scope: string, ip: string, email: string): boolean {
  const now = Date.now();
  prune(now);
  const normalized = email.trim().toLowerCase();
  return (
    readCount(`${scope}:ip:${ip}`, now) >= MAX_PER_IP ||
    (normalized.length > 0 && readCount(`${scope}:pair:${ip}:${normalized}`, now) >= MAX_PER_EMAIL)
  );
}

export function noteAuthAttempt(scope: string, ip: string, email: string) {
  const now = Date.now();
  const normalized = email.trim().toLowerCase();
  bump(`${scope}:ip:${ip}`, now);
  if (normalized) {
    bump(`${scope}:pair:${ip}:${normalized}`, now);
  }
}

export function clearAuthEmailAttempts(scope: string, ip: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return;
  }
  buckets.delete(`${scope}:pair:${ip}:${normalized}`);
}
