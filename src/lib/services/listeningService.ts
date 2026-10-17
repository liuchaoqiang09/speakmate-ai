import { z } from "zod";
import { callDeepSeek } from "@/src/lib/ai/deepseek";
import { prisma } from "@/src/lib/db/prisma";
import {
  getListeningModule,
  isExamListening,
  listeningTopicLabel,
  type ListeningModule,
} from "@/src/lib/listening/modules";
import { scheduleRetentionPurge } from "@/src/lib/services/retentionService";

const questionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["choice", "gap", "true_false", "matching"]),
  prompt: z.string().min(1),
  prompt_zh: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  answer: z.string().min(1),
  explanation: z.string().min(1),
  explanation_zh: z.string().min(1),
});

const generatedSchema = z.object({
  title: z.string().min(1),
  title_zh: z.string().min(1),
  instructions: z.string().optional(),
  instructions_zh: z.string().optional(),
  script: z.string().min(40),
  script_zh: z.string().min(1),
  questions: z.array(questionSchema).min(2).max(10),
});

type AnswerRow = {
  id: string;
  answer: string;
  explanation: string;
  explanationZh: string;
};

type ResultDetail = {
  id: string;
  given: string;
  answer: string;
  correct: boolean;
  explanation: string;
  explanationZh: string;
};

function difficultyGuide(difficulty: string): string {
  if (difficulty === "初级") {
    return "80 to 95 words. Very common vocabulary. Short sentences. One clear main point.";
  }
  if (difficulty === "高级") {
    return "120 to 150 words. Natural spoken English with one contrast or extra detail.";
  }
  return "100 to 120 words. Everyday vocabulary. Include one time, place, or number.";
}

function dailyPrompt(topic: string, difficulty: string): string {
  return [
    "You write ONE English listening clip for learners, then questions.",
    "Return STRICT JSON only.",
    `Topic: ${listeningTopicLabel(topic)} (${topic}).`,
    `Level: ${difficulty}. ${difficultyGuide(difficulty)}`,
    "script is spoken English. Prefer A: and B: dialogue, or a short announcement.",
    "Include 2 or 3 concrete facts: time, place, number, reason, or choice.",
    "questions: 4 items. Mix types: two choice, one gap, one true_false.",
    "choice questions need exactly 3 short options.",
    "gap answer is 1 to 4 words from the script. true_false answer is True or False.",
  ].join(" ");
}

function exampleShape(module: ListeningModule | undefined, exam: boolean) {
  if (exam && module?.group === "ielts" && module.id === "ielts_s4") {
    return {
      title: "Lecture title",
      title_zh: "讲座标题",
      instructions: "Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.",
      instructions_zh: "完成笔记。每空不超过两个词和/或一个数字。",
      script: "Good morning. Today I will...",
      script_zh: "全文中文",
      questions: [
        {
          id: "q1",
          type: "gap",
          prompt: "Main cause of decline: ______",
          prompt_zh: "下降的主要原因：______",
          answer: "pollution",
          explanation: "The lecturer names pollution as the main cause.",
          explanation_zh: "讲座点明主因是污染。",
        },
      ],
    };
  }
  const four = exam && module?.group !== "ielts";
  const three = module?.group === "ielts";
  return {
    title: "short English title",
    title_zh: "中文标题",
    instructions: exam ? "Listen once and answer." : "Listen then answer.",
    instructions_zh: exam ? "录音只放一遍，边听边答。" : "先听后答。",
    script: exam ? "M: ... W: ..." : "A: ... B: ...",
    script_zh: "全文中文",
    questions: [
      {
        id: "q1",
        type: exam && module?.id.startsWith("ielts_s") && module.id !== "ielts_s3" ? "gap" : "choice",
        prompt: "What does the woman mean?",
        prompt_zh: "女士是什么意思？",
        options: four
          ? ["A) Option one", "B) Option two", "C) Option three", "D) Option four"]
          : three
            ? ["A) Option one", "B) Option two", "C) Option three"]
            : ["A", "B", "C"],
        answer: four ? "A) Option one" : three ? "A) Option one" : "A",
        explanation: "why",
        explanation_zh: "原因",
      },
    ],
  };
}

function adviceFor(topic: string, allCorrect: boolean): string {
  if (allCorrect) {
    if (topic.startsWith("ielts_s") && topic !== "ielts_s4") {
      return "这一部分全对。下一档可以练更难的 Section。";
    }
    if (topic === "toefl_conversation") {
      return "对话全对。下一轮练 Lecture，题量和信息密度都会上去。";
    }
    if (topic.startsWith("cet4")) {
      return "这一段四级全对。可以继续下一部分，或试六级。";
    }
    return "全部听对了。可以换更难的分区，或去重听巩固。";
  }
  return "对照原文看错题：数字、专有名词、说话人改口。考试听力只放一遍，先改完再重听错过的题。";
}

export async function createListeningSession(userId: string, topic: string, difficulty: string) {
  const module = getListeningModule(topic);
  if (!module) {
    return { success: false as const, error: "请选择听力模块", status: 400 };
  }
  const exam = isExamListening(module.id);
  const level = exam ? module.difficulty : difficulty || module.difficulty;
  const prompt = [
    "Return STRICT JSON only. No markdown.",
    exam ? module.prompt : dailyPrompt(module.id, level),
    "Do not put the correct answer in the prompt text.",
    "Every question needs prompt, prompt_zh, explanation, explanation_zh.",
    `Number of questions must be between ${module.questionsMin} and ${module.questionsMax}.`,
    JSON.stringify(exampleShape(module, exam)),
  ].join("\n");

  const ai = await callDeepSeek(
    [
      { role: "system", content: "Return only valid JSON. No markdown." },
      { role: "user", content: prompt },
    ],
    { timeoutMs: 60_000, temperature: exam ? 0.55 : 0.7 }
  );

  if (!ai.success || !ai.data) {
    return { success: false as const, error: ai.error || "听力材料生成失败", status: 502 };
  }

  let parsedJson: unknown;
  try {
    const raw = ai.data.content.trim();
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    parsedJson = JSON.parse(fenced?.[1]?.trim() || raw);
  } catch {
    return { success: false as const, error: "听力材料格式无效", status: 502 };
  }

  const parsed = generatedSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { success: false as const, error: "听力题目结构无效", status: 502 };
  }
  if (
    parsed.data.questions.length < module.questionsMin ||
    parsed.data.questions.length > module.questionsMax
  ) {
    return { success: false as const, error: "听力题目数量不符合该考试部分", status: 502 };
  }

  const publicQuestions = parsed.data.questions.map((item) => ({
    id: item.id,
    type: item.type === "matching" ? "choice" : item.type,
    prompt: item.prompt,
    promptZh: item.prompt_zh,
    options: item.options || [],
  }));

  const created = await prisma.listeningSession.create({
    data: {
      userId,
      topic: module.id,
      difficulty: level,
      publicContent: {
        title: parsed.data.title,
        titleZh: parsed.data.title_zh,
        instructions: parsed.data.instructions || module.rulesZh,
        instructionsZh: parsed.data.instructions_zh || module.rulesZh,
        script: parsed.data.script,
        scriptZh: parsed.data.script_zh,
        questions: publicQuestions,
        format: module.group,
        examLabel: module.examLabel,
        playOnce: module.playOnce,
        voiceLang: module.voiceLang,
        defaultRate: module.defaultRate,
      },
      answerKey: {
        answers: parsed.data.questions.map((item) => ({
          id: item.id,
          answer: item.answer.trim(),
          explanation: item.explanation,
          explanationZh: item.explanation_zh,
        })),
      },
      status: "in_progress",
    },
    select: {
      id: true,
      topic: true,
      difficulty: true,
      publicContent: true,
      status: true,
    },
  });

  return { success: true as const, data: created };
}

export async function getListeningSession(userId: string, id: string) {
  const session = await prisma.listeningSession.findFirst({
    where: { id, userId },
    select: {
      id: true,
      topic: true,
      difficulty: true,
      publicContent: true,
      status: true,
      result: true,
      response: true,
    },
  });
  if (!session) {
    return { success: false as const, error: "听力练习不存在", status: 404 };
  }
  return { success: true as const, data: session };
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^(a|an|the)\s+/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function optionLetter(value: string): string {
  return value.trim().match(/^([A-Ga-g])(?:[).:\s]|$)/)?.[1]?.toLowerCase() || "";
}

function answersMatch(given: string, expected: string): boolean {
  if (!given.trim()) {
    return false;
  }
  const left = normalizeAnswer(given);
  const right = normalizeAnswer(expected);
  if (left === right || (right.length > 2 && left.includes(right)) || (left.length > 2 && right.includes(left))) {
    return true;
  }
  const givenLetter = optionLetter(given);
  const expectedLetter = optionLetter(expected);
  return Boolean(givenLetter && expectedLetter && givenLetter === expectedLetter);
}

function readDetails(raw: unknown): ResultDetail[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const details = (raw as { details?: unknown }).details;
  if (!Array.isArray(details)) {
    return [];
  }
  return details.filter((item): item is ResultDetail => {
    return Boolean(item && typeof item === "object" && typeof (item as ResultDetail).id === "string");
  });
}

export async function submitListening(
  userId: string,
  id: string,
  answers: Record<string, string>
) {
  const session = await prisma.listeningSession.findFirst({
    where: { id, userId },
  });
  if (!session) {
    return { success: false as const, error: "听力练习不存在", status: 404 };
  }
  if (session.status === "submitted") {
    return {
      success: true as const,
      data: {
        id: session.id,
        publicContent: session.publicContent,
        result: session.result,
        response: session.response,
        status: session.status,
        topic: session.topic,
        difficulty: session.difficulty,
      },
    };
  }

  const key = session.answerKey as { answers?: AnswerRow[] };
  const expected = Array.isArray(key.answers) ? key.answers : [];
  const details = expected.map((item) => {
    const given = typeof answers[item.id] === "string" ? answers[item.id] : "";
    const correct = answersMatch(given, item.answer);
    return {
      id: item.id,
      given,
      answer: item.answer,
      correct,
      explanation: item.explanation,
      explanationZh: item.explanationZh,
    };
  });
  const correctCount = details.filter((item) => item.correct).length;
  const result = {
    correctCount,
    total: details.length,
    details,
    adviceZh: adviceFor(session.topic, correctCount === details.length),
  };

  const updated = await prisma.listeningSession.update({
    where: { id },
    data: {
      response: answers,
      result,
      status: "submitted",
      submittedAt: new Date(),
    },
    select: {
      id: true,
      topic: true,
      difficulty: true,
      publicContent: true,
      result: true,
      response: true,
      status: true,
    },
  });

  return { success: true as const, data: updated };
}

export async function listListeningHistory(userId: string) {
  scheduleRetentionPurge();
  const rows = await prisma.listeningSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      topic: true,
      difficulty: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      publicContent: true,
      result: true,
    },
  });

  return rows.map((row) => {
    const content = (row.publicContent || {}) as { titleZh?: string; title?: string; examLabel?: string };
    const score = row.result as { correctCount?: number; total?: number } | null;
    return {
      id: row.id,
      topic: row.topic,
      topicLabel: content.examLabel || listeningTopicLabel(row.topic),
      difficulty: row.difficulty,
      title: content.titleZh || content.title || listeningTopicLabel(row.topic),
      status: row.status,
      score:
        typeof score?.correctCount === "number" && typeof score?.total === "number"
          ? `${score.correctCount}/${score.total}`
          : "",
      at: (row.submittedAt || row.createdAt).toISOString(),
      href: `/listening/practice?id=${row.id}`,
    };
  });
}

export async function deleteListeningSession(userId: string, id: string) {
  const session = await prisma.listeningSession.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!session) {
    return { success: false as const, error: "听力练习不存在", status: 404 };
  }
  await prisma.listeningSession.delete({ where: { id } });
  return { success: true as const };
}

export async function clearListeningHistory(userId: string) {
  const result = await prisma.listeningSession.deleteMany({ where: { userId } });
  return { success: true as const, data: { deleted: result.count } };
}

export async function countWrongListening(userId: string): Promise<number> {
  const rows = await prisma.listeningSession.findMany({
    where: { userId, status: "submitted" },
    select: { result: true, publicContent: true },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  let count = 0;
  for (const row of rows) {
    const content = (row.publicContent || {}) as { compacted?: boolean; questions?: unknown[] };
    if (content.compacted || !Array.isArray(content.questions) || content.questions.length === 0) {
      continue;
    }
    count += readDetails(row.result).filter((item) => item.correct === false).length;
  }
  return count;
}

export async function createRetryWrongSession(userId: string) {
  const latest = await prisma.listeningSession.findMany({
    where: { userId, status: "submitted" },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const source = latest.find((row) => {
    const content = (row.publicContent || {}) as { compacted?: boolean; questions?: unknown[] };
    if (content.compacted || !Array.isArray(content.questions) || content.questions.length === 0) {
      return false;
    }
    return readDetails(row.result).some((item) => item.correct === false);
  });
  if (!source) {
    return { success: false as const, error: "还没有听错的题。先完成一轮听力。", status: 404 };
  }

  const wrongIds = new Set(
    readDetails(source.result)
      .filter((item) => item.correct === false)
      .map((item) => item.id)
  );
  const content = source.publicContent as {
    title?: string;
    titleZh?: string;
    script?: string;
    scriptZh?: string;
    questions?: Array<{ id: string; type: string; prompt: string; promptZh: string; options?: string[] }>;
    format?: string;
    playOnce?: boolean;
  };
  const key = source.answerKey as { answers?: AnswerRow[] };
  const questions = (content.questions || []).filter((item) => wrongIds.has(item.id));
  const answers = (key.answers || []).filter((item) => wrongIds.has(item.id));
  if (questions.length === 0 || answers.length === 0) {
    return { success: false as const, error: "还没有听错的题。先完成一轮听力。", status: 404 };
  }

  const created = await prisma.listeningSession.create({
    data: {
      userId,
      topic: source.topic,
      difficulty: source.difficulty,
      publicContent: {
        ...content,
        title: content.title || "Wrong questions",
        titleZh: `重听错题 · ${content.titleZh || listeningTopicLabel(source.topic)}`,
        questions,
        retryFrom: source.id,
        playOnce: false,
      },
      answerKey: { answers },
      status: "in_progress",
    },
    select: { id: true },
  });

  return { success: true as const, data: created };
}
