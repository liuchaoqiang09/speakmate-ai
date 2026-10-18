import { Prisma } from "@prisma/client";
import {
  generateIeltsReading,
  generateIeltsWriting,
  generateToeflReading,
  generateToeflWriting,
} from "@/src/lib/exam/generatePaper";
import { callDeepSeek } from "@/src/lib/ai/deepseek";
import {
  countWords,
  ieltsWritingScoreSchema,
  normalizeToeflWriting,
  normalizeWritingScores,
  scoreReading,
  scoreSentenceOrder,
  stripReadingKey,
  stripWritingKey,
  toeflWritingScoreSchema,
  type IeltsReadingPaper,
  type IeltsWritingPaper,
  type ToeflReadingPaper,
  type ToeflWritingPaper,
} from "@/src/lib/exam/paperContent";
import { findReadingSet } from "@/src/lib/exam/readingSets";
import { prisma } from "@/src/lib/db/prisma";

export type PaperExam = "ielts" | "toefl";
export type PaperSkill = "reading" | "writing";

function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fenced?.[1]) {
      throw new Error("PARSE_ERROR");
    }
    return JSON.parse(fenced[1].trim());
  }
}

function prefixPassage(paper: IeltsReadingPaper, prefix: string): IeltsReadingPaper {
  return {
    passages: paper.passages.map((passage) => ({
      ...passage,
      questions: passage.questions.map((question) => ({ ...question, id: `${prefix}${question.id}` })),
    })),
  };
}

async function buildPaper(exam: PaperExam, skill: PaperSkill, readingSet?: string | null) {
  if (exam === "ielts" && skill === "reading" && (!readingSet || readingSet === "full")) {
    const pieces: IeltsReadingPaper[] = [];
    const passageIds = ["passage1", "passage2", "passage3"] as const;
    for (let index = 0; index < passageIds.length; index += 1) {
      pieces.push(prefixPassage(await generateIeltsReading(passageIds[index]), `p${index + 1}-`));
    }
    const paper: IeltsReadingPaper = { passages: pieces.flatMap((item) => item.passages) };
    return {
      publicContent: {
        ...stripReadingKey(exam, paper),
        minutes: 60,
        setLabel: "Full reading",
        setLabelZh: "三篇完整阅读",
        questionTypes: "40 questions across three passages",
      },
      answerKey: paper,
    };
  }
  if (exam === "ielts" && skill === "reading") {
    const set = findReadingSet(exam, readingSet);
    const paper = await generateIeltsReading(set.id);
    return {
      publicContent: { ...stripReadingKey(exam, paper), minutes: set.minutes, setLabel: set.label, setLabelZh: set.labelZh, questionTypes: set.types },
      answerKey: paper,
    };
  }
  if (exam === "toefl" && skill === "reading" && (!readingSet || readingSet === "full")) {
    const words = await generateToeflReading("complete_words");
    const daily = await generateToeflReading("daily_life");
    const academic = await generateToeflReading("academic");
    const paper: ToeflReadingPaper = {
      completeWords: words.completeWords,
      dailyLife: daily.dailyLife,
      academic: academic.academic,
    };
    return {
      publicContent: {
        ...stripReadingKey(exam, paper),
        minutes: 30,
        setLabel: "Full reading",
        setLabelZh: "阅读整场",
        questionTypes: "Complete the Words, daily life, academic passage",
      },
      answerKey: paper,
    };
  }
  if (exam === "toefl" && skill === "reading") {
    const set = findReadingSet(exam, readingSet);
    const paper = await generateToeflReading(set.id);
    return {
      publicContent: { ...stripReadingKey(exam, paper), minutes: set.minutes, setLabel: set.label, setLabelZh: set.labelZh, questionTypes: set.types },
      answerKey: paper,
    };
  }
  if (exam === "ielts" && skill === "writing") {
    const paper = await generateIeltsWriting();
    return { publicContent: stripWritingKey(exam, paper), answerKey: paper };
  }
  const paper = await generateToeflWriting();
  return { publicContent: stripWritingKey(exam, paper), answerKey: paper };
}

function templateSetId(exam: PaperExam, skill: PaperSkill, readingSet?: string | null): string {
  if (skill === "writing") {
    return "writing";
  }
  if (!readingSet || readingSet === "full") {
    return "full";
  }
  return findReadingSet(exam, readingSet).id;
}

async function readTemplate(exam: PaperExam, skill: PaperSkill, setId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ public_content: unknown; answer_key: unknown }>>(
    `SELECT public_content, answer_key
     FROM exam_paper_templates
     WHERE exam_type = $1 AND skill = $2 AND set_id = $3
     ORDER BY created_at DESC
     LIMIT 5`,
    exam,
    skill,
    setId
  );
  if (!rows.length) {
    return null;
  }
  return rows[Math.floor(Math.random() * rows.length)];
}

async function saveTemplate(
  exam: PaperExam,
  skill: PaperSkill,
  setId: string,
  publicContent: unknown,
  answerKey: unknown
) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO exam_paper_templates (id, exam_type, skill, set_id, public_content, answer_key)
     VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5::jsonb)`,
    exam,
    skill,
    setId,
    JSON.stringify(publicContent),
    JSON.stringify(answerKey)
  );
}

export async function createExamPaper(
  userId: string,
  exam: PaperExam,
  skill: PaperSkill,
  readingSet?: string | null
) {
  const setId = templateSetId(exam, skill, readingSet);
  try {
    let built: { publicContent: unknown; answerKey: unknown } | null = null;
    try {
      const cached = await readTemplate(exam, skill, setId);
      if (cached) {
        built = { publicContent: cached.public_content, answerKey: cached.answer_key };
      }
    } catch {
      built = null;
    }
    if (!built) {
      built = await buildPaper(exam, skill, readingSet);
      try {
        await saveTemplate(exam, skill, setId, built.publicContent, built.answerKey);
      } catch (cacheError) {
        console.error("保存已检查试卷失败", {
          name: cacheError instanceof Error ? cacheError.name : "UnknownError",
        });
      }
    }
    const paper = await prisma.examPaper.create({
      data: {
        userId,
        examType: exam,
        skill,
        publicContent: built.publicContent as Prisma.InputJsonValue,
        answerKey: built.answerKey as Prisma.InputJsonValue,
        status: "in_progress",
      },
      select: { id: true, examType: true, skill: true, publicContent: true, startedAt: true },
    });
    return { success: true as const, data: { paper } };
  } catch (error) {
    console.error("生成试卷失败", {
      exam,
      skill,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "生成试卷失败",
      status: 502,
    };
  }
}

export async function getExamPaper(userId: string, paperId: string) {
  const paper = await prisma.examPaper.findFirst({
    where: { id: paperId, userId },
    select: {
      id: true,
      examType: true,
      skill: true,
      publicContent: true,
      response: true,
      result: true,
      status: true,
      startedAt: true,
      submittedAt: true,
    },
  });
  if (!paper) {
    return { success: false as const, error: "试卷不存在", status: 404 };
  }
  const content = paper.publicContent as { compacted?: boolean } | null;
  if (content?.compacted && paper.status !== "submitted") {
    return { success: false as const, error: "试卷原文已过期清理，请重新出题", status: 410 };
  }
  return { success: true as const, data: { paper } };
}

async function scoreWriting(exam: PaperExam, answerKey: unknown, answers: Record<string, unknown>) {
  if (exam === "ielts") {
    const paper = answerKey as IeltsWritingPaper;
    const task1 = typeof answers.task1 === "string" ? answers.task1 : "";
    const task2 = typeof answers.task2 === "string" ? answers.task2 : "";
    const words = { task1: countWords(task1), task2: countWords(task2) };
    const ai = await callDeepSeek(
      [
        {
          role: "system",
          content: "Return only JSON. Scores are half bands from 0 to 9. This is study advice, not an official result.",
        },
        {
          role: "user",
          content: [
            "Score this IELTS Academic Writing paper.",
            "Task 1 criteria: task achievement, coherence and cohesion, lexical resource, grammatical range and accuracy.",
            "Task 2 uses task response instead of task achievement. The field name is still task_achievement.",
            "Under-length writing should lower the task score. Task 1 minimum 150 words. Task 2 minimum 250 words.",
            "Task 1 missed_points should name a missing overview when the response never states the main trend.",
            "Task 2 missed_points should name a missing position when the response never states a clear opinion.",
            `Task 1 prompt: ${paper.task1.prompt}`,
            `Task 1 table: ${JSON.stringify(paper.task1.table)}`,
            `Task 1 response (${words.task1} words): ${task1 || "(blank)"}`,
            `Task 2 prompt: ${paper.task2.prompt}`,
            `Task 2 response (${words.task2} words): ${task2 || "(blank)"}`,
            'JSON: { task1: { task_achievement, coherence, lexical, grammar, comment, missed_points, covered_points }, task2: { task_achievement, coherence, lexical, grammar, comment, missed_points, covered_points } }',
          ].join("\n"),
        },
      ],
      { timeoutMs: 90000, temperature: 0.2 }
    );
    if (!ai.success || !ai.data) {
      throw new Error(ai.error || "写作评分失败");
    }
    const parsed = ieltsWritingScoreSchema.safeParse(parseModelJson(ai.data.content));
    if (!parsed.success) {
      throw new Error("写作评分结构无效");
    }
    return normalizeWritingScores(parsed.data, words);
  }

  const paper = answerKey as ToeflWritingPaper;
  const sentenceAnswers = (answers.sentences && typeof answers.sentences === "object"
    ? answers.sentences
    : {}) as Record<string, string[]>;
  const email = typeof answers.email === "string" ? answers.email : "";
  const discussion = typeof answers.discussion === "string" ? answers.discussion : "";
  const sentenceCorrect = scoreSentenceOrder(paper, sentenceAnswers);
  const ai = await callDeepSeek(
    [
      {
        role: "system",
        content: "Return only JSON. Scores are integers from 0 to 5. This is study advice, not an official result.",
      },
      {
        role: "user",
        content: [
          "Score the TOEFL Write an Email and Write for an Academic Discussion responses.",
          "Email: elaboration, syntactic variety, social conventions, and language errors. 7 minutes, a few sentences is enough.",
          "email.missed_points must copy required points the writer did not cover.",
          "Discussion: relevant elaborated opinion, syntactic variety, and language control.",
          `Email scenario: ${paper.email.scenario}`,
          `Required points: ${paper.email.points.join("; ")}`,
          `Email response (${countWords(email)} words): ${email || "(blank)"}`,
          `Professor: ${paper.discussion.professor}`,
          `Student A: ${paper.discussion.studentA}`,
          `Student B: ${paper.discussion.studentB}`,
          `Discussion response (${countWords(discussion)} words): ${discussion || "(blank)"}`,
          'JSON: { email: { score, comment, missed_points, covered_points }, discussion: { score, comment, missed_points, covered_points } }',
        ].join("\n"),
      },
    ],
    { timeoutMs: 90000, temperature: 0.2 }
  );
  if (!ai.success || !ai.data) {
    throw new Error(ai.error || "写作评分失败");
  }
  const parsed = toeflWritingScoreSchema.safeParse(parseModelJson(ai.data.content));
  if (!parsed.success) {
    throw new Error("写作评分结构无效");
  }
  return normalizeToeflWriting(parsed.data, sentenceCorrect, {
    email: countWords(email),
    discussion: countWords(discussion),
  });
}

export async function submitExamPaper(
  userId: string,
  paperId: string,
  answers: Record<string, unknown>
) {
  const paper = await prisma.examPaper.findFirst({
    where: { id: paperId, userId },
  });
  if (!paper) {
    return { success: false as const, error: "试卷不存在", status: 404 };
  }
  if (paper.status === "submitted" && paper.result) {
    return {
      success: true as const,
      data: { result: paper.result, status: paper.status },
    };
  }

  try {
    const exam = paper.examType === "toefl" ? "toefl" : "ielts";
    const result =
      paper.skill === "reading"
        ? scoreReading(
            exam,
            paper.answerKey as IeltsReadingPaper | ToeflReadingPaper,
            Object.fromEntries(
              Object.entries(answers).map(([key, value]) => [key, typeof value === "string" ? value : ""])
            )
          )
        : await scoreWriting(exam, paper.answerKey, answers);

    const saved = await prisma.examPaper.update({
      where: { id: paper.id },
      data: {
        response: answers as Prisma.InputJsonValue,
        result: result as Prisma.InputJsonValue,
        status: "submitted",
        submittedAt: new Date(),
      },
      select: { result: true, status: true },
    });
    return { success: true as const, data: saved };
  } catch (error) {
    console.error("试卷评分失败", {
      paperId,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "评分失败",
      status: 502,
    };
  }
}
