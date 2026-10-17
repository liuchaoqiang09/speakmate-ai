import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { clientIpFromHeaders, noteAuthAttempt, tooManyAuthAttempts } from "@/src/lib/auth/attemptLimit";
import { prisma } from "@/src/lib/db/prisma";

const registerSchema = z.object({
  email: z
    .string({ required_error: "请填写邮箱" })
    .trim()
    .toLowerCase()
    .email("邮箱格式不正确"),
  password: z
    .string({ required_error: "请填写密码" })
    .min(8, "密码至少 8 位")
    .max(72, "密码过长"),
  displayName: z
    .string()
    .trim()
    .max(50, "显示名过长")
    .optional()
    .or(z.literal("")),
});

export async function POST(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "JSON 解析错误：请求体必须是合法 JSON" },
      { status: 400 }
    );
  }

  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { success: false, error: firstIssue?.message || "输入校验失败" },
      { status: 400 }
    );
  }

  const email = parsed.data.email;
  const ip = clientIpFromHeaders(request.headers);
  if (tooManyAuthAttempts("register", ip, email)) {
    return NextResponse.json(
      { success: false, error: "尝试次数过多，请 15 分钟后再试" },
      { status: 429 }
    );
  }
  noteAuthAttempt("register", ip, email);

  const displayName = parsed.data.displayName
    ? parsed.data.displayName
    : null;

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const existing = await prisma.profile.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ success: true });
  }

  try {
    await prisma.profile.create({
      data: {
        email,
        passwordHash,
        displayName,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ success: true });
    }

    console.error("注册失败", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { success: false, error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
