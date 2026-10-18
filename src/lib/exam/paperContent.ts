import { z } from "zod";

const paragraphSchema = z.object({
  label: z.string().trim().min(1).max(4),
  text: z.string().trim().min(40),
});

const choiceSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("multiple_choice"),
  prompt: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).min(3).max(4),
  answer: z.string().trim().min(1),
  explanation: z.string().trim().min(1).optional(),
});

const tfngSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("true_false_not_given"),
  prompt: z.string().trim().min(1),
  answer: z.enum(["True", "False", "Not Given"]),
  explanation: z.string().trim().min(1).optional(),
});

const ynngSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("yes_no_not_given"),
  prompt: z.string().trim().min(1),
  answer: z.enum(["Yes", "No", "Not Given"]),
  explanation: z.string().trim().min(1).optional(),
});

const completionSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("completion"),
  prompt: z.string().trim().min(1),
  wordLimit: z.number().int().min(1).max(3),
  answer: z.string().trim().min(1),
  explanation: z.string().trim().min(1).optional(),
});

const headingQuestionSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("matching_heading"),
  paragraph: z.string().trim().min(1).max(4),
  answer: z.string().trim().min(1),
  explanation: z.string().trim().min(1).optional(),
});

const readingQuestionSchema = z.discriminatedUnion("type", [
  choiceSchema,
  tfngSchema,
  ynngSchema,
  completionSchema,
  headingQuestionSchema,
]);

const passageSchema = z.object({
  title: z.string().trim().min(1),
  paragraphs: z.array(paragraphSchema).min(3).max(6),
  headings: z.array(z.object({ id: z.string().trim().min(1), text: z.string().trim().min(1) })).optional(),
  questions: z.array(readingQuestionSchema).min(4),
});

export const ieltsReadingSchema = z.object({
  passages: z.array(passageSchema).min(1).max(3),
});

const blankSchema = z.object({
  id: z.string().trim().min(1),
  prefix: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  explanation: z.string().trim().min(1).optional(),
});

const dailyTextSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(20),
  questions: z.array(choiceSchema).min(2).max(3),
});

const academicSchema = z.object({
  title: z.string().trim().min(1),
  paragraphs: z.array(z.string().trim().min(40)).min(3).max(5),
  questions: z.array(choiceSchema).min(4).max(8),
});

export const toeflReadingSchema = z
  .object({
    completeWords: z
      .object({
        sentence: z.string().trim().min(20),
        blanks: z.array(blankSchema).min(6).max(10),
      })
      .optional(),
    dailyLife: z.array(dailyTextSchema).min(1).max(2).optional(),
    academic: academicSchema.optional(),
  })
  .refine((value) => Boolean(value.completeWords || value.dailyLife?.length || value.academic), {
    message: "至少要有一种阅读任务",
  });

const tableSchema = z.object({
  columns: z.array(z.string().trim().min(1)).min(2).max(4),
  rows: z.array(z.array(z.string().trim().min(1)).min(2).max(4)).min(3).max(6),
});

export const ieltsWritingSchema = z.object({
  task1: z.object({
    prompt: z.string().trim().min(20),
    kind: z.enum(["table", "chart", "process", "map"]).optional(),
    table: tableSchema,
  }),
  task2: z.object({
    prompt: z.string().trim().min(20),
  }),
});

const scrambleSchema = z.object({
  id: z.string().trim().min(1),
  speakerLine: z.string().trim().min(1),
  tokens: z.array(z.string().trim().min(1)).min(4).max(10),
});

export const toeflWritingSchema = z.object({
  sentences: z.array(scrambleSchema).length(10),
  email: z.object({
    scenario: z.string().trim().min(20),
    points: z.array(z.string().trim().min(1)).min(2).max(4),
  }),
  discussion: z.object({
    professor: z.string().trim().min(20),
    studentA: z.string().trim().min(20),
    studentB: z.string().trim().min(20),
  }),
});

const writingScoreSchema = z.object({
  task_achievement: z.number(),
  coherence: z.number(),
  lexical: z.number(),
  grammar: z.number(),
  comment: z.string().trim().min(1),
  missed_points: z.array(z.string()).optional(),
  covered_points: z.array(z.string()).optional(),
});

export const ieltsWritingScoreSchema = z.object({
  task1: writingScoreSchema,
  task2: writingScoreSchema,
});

const toeflTaskScoreSchema = z.object({
  score: z.number(),
  comment: z.string().trim().min(1),
  missed_points: z.array(z.string()).optional(),
  covered_points: z.array(z.string()).optional(),
});

export const toeflWritingScoreSchema = z.object({
  email: toeflTaskScoreSchema,
  discussion: toeflTaskScoreSchema,
});

export type IeltsReadingPaper = z.infer<typeof ieltsReadingSchema>;
export type ToeflReadingPaper = z.infer<typeof toeflReadingSchema>;
export type IeltsWritingPaper = z.infer<typeof ieltsWritingSchema>;
export type ToeflWritingPaper = z.infer<typeof toeflWritingSchema>;

function halfBand(value: number): number {
  const rounded = Math.round(value * 2) / 2;
  return Math.min(9, Math.max(0, rounded));
}

function taskScore(value: number): number {
  return Math.min(5, Math.max(0, Math.round(value)));
}

function scrambleTokens(tokens: string[], seed: string): string[] {
  const copy = [...tokens];
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }
  for (let index = copy.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const swap = hash % (index + 1);
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  if (copy.join("\n") === tokens.join("\n") && copy.length > 1) {
    const first = copy.shift();
    if (first) {
      copy.push(first);
    }
  }
  return copy;
}

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

/** 学术类阅读原始分换算成参考 band。40 题量表，不足 40 题时按比例折算。 */
export function ieltsReadingBand(correct: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  const scaled = Math.round((correct / total) * 40);
  const table: Array<[number, number]> = [
    [39, 9],
    [37, 8.5],
    [35, 8],
    [33, 7.5],
    [30, 7],
    [27, 6.5],
    [23, 6],
    [19, 5.5],
    [15, 5],
    [13, 4.5],
    [10, 4],
    [8, 3.5],
    [6, 3],
    [4, 2.5],
  ];
  for (const [minimum, band] of table) {
    if (scaled >= minimum) {
      return band;
    }
  }
  return scaled <= 0 ? 0 : 2;
}

export function toeflSectionBand(correct: number, total: number): number {
  if (total <= 0 || correct <= 0) {
    return 1;
  }
  const ratio = correct / total;
  const steps = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
  const index = Math.min(steps.length - 1, Math.max(0, Math.round(ratio * (steps.length - 1))));
  return steps[index];
}

function questionExplanation(question: { type: string; answer: string; explanation?: string }): string {
  if (question.explanation?.trim()) {
    return question.explanation.trim();
  }
  if (question.answer === "Not Given") {
    return "The passage does not state this, so the answer is Not Given.";
  }
  return `The passage supports this answer: ${question.answer}.`;
}

function readingQuestions(paper: IeltsReadingPaper | ToeflReadingPaper, exam: "ielts" | "toefl") {
  if (exam === "ielts") {
    return (paper as IeltsReadingPaper).passages.flatMap((passage) => passage.questions);
  }
  const toefl = paper as ToeflReadingPaper;
  return [
    ...(toefl.completeWords?.blanks || []).map((blank) => ({
      id: blank.id,
      type: "blank" as const,
      answer: blank.answer,
      wordLimit: 1,
      explanation: blank.explanation,
    })),
    ...(toefl.dailyLife || []).flatMap((text) => text.questions),
    ...(toefl.academic?.questions || []),
  ];
}

export function scoreReading(
  exam: "ielts" | "toefl",
  paper: IeltsReadingPaper | ToeflReadingPaper,
  answers: Record<string, string>
): {
  correct: number;
  total: number;
  band: number;
  scale: string;
  items: Array<{ id: string; given: string; expected: string; correct: boolean; explanation: string }>;
} {
  const questions = readingQuestions(paper, exam);
  const items = questions.map((question) => {
    const given = answers[question.id] || "";
    const expected = question.answer;
    let correct = normalizeAnswer(given) === normalizeAnswer(expected);
    if (question.type === "completion" && countWords(given) > question.wordLimit) {
      correct = false;
    }
    if (question.type === "blank") {
      correct = normalizeAnswer(given) === normalizeAnswer(expected);
    }
    return { id: question.id, given, expected, correct, explanation: questionExplanation(question) };
  });
  const correct = items.filter((item) => item.correct).length;
  const band = exam === "ielts" ? ieltsReadingBand(correct, items.length) : toeflSectionBand(correct, items.length);
  return {
    correct,
    total: items.length,
    band,
    scale: exam === "ielts" ? "ielts-reading-band" : "toefl-reading-1-6",
    items,
  };
}

export function stripReadingKey(exam: "ielts" | "toefl", paper: IeltsReadingPaper | ToeflReadingPaper) {
  if (exam === "ielts") {
    const source = paper as IeltsReadingPaper;
    return {
      exam,
      skill: "reading" as const,
      minutes: 60,
      passages: source.passages.map((passage) => ({
        title: passage.title,
        paragraphs: passage.paragraphs,
        headings: passage.headings?.map((heading) => ({ id: heading.id, text: heading.text })),
        questions: passage.questions.map((question) => {
          if (question.type === "multiple_choice") {
            return { id: question.id, type: question.type, prompt: question.prompt, options: question.options };
          }
          if (question.type === "completion") {
            return { id: question.id, type: question.type, prompt: question.prompt, wordLimit: question.wordLimit };
          }
          if (question.type === "matching_heading") {
            return { id: question.id, type: question.type, paragraph: question.paragraph };
          }
          return { id: question.id, type: question.type, prompt: question.prompt };
        }),
      })),
    };
  }

  const source = paper as ToeflReadingPaper;
  return {
    exam,
    skill: "reading" as const,
    minutes: 30,
    completeWords: source.completeWords
      ? {
          sentence: source.completeWords.sentence,
          blanks: source.completeWords.blanks.map((blank) => ({ id: blank.id, prefix: blank.prefix })),
        }
      : undefined,
    dailyLife: source.dailyLife?.map((text) => ({
      title: text.title,
      body: text.body,
      questions: text.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        options: question.options,
      })),
    })),
    academic: source.academic
      ? {
          title: source.academic.title,
          paragraphs: source.academic.paragraphs,
          questions: source.academic.questions.map((question) => ({
            id: question.id,
            type: question.type,
            prompt: question.prompt,
            options: question.options,
          })),
        }
      : undefined,
  };
}

export function stripWritingKey(exam: "ielts" | "toefl", paper: IeltsWritingPaper | ToeflWritingPaper) {
  if (exam === "ielts") {
    const source = paper as IeltsWritingPaper;
    return {
      exam,
      skill: "writing" as const,
      minutes: 60,
      task1: {
        minutes: 20,
        minimumWords: 150,
        prompt: source.task1.prompt,
        kind: source.task1.kind || "table",
        table: source.task1.table,
      },
      task2: { minutes: 40, minimumWords: 250, prompt: source.task2.prompt },
    };
  }
  const source = paper as ToeflWritingPaper;
  return {
    exam,
    skill: "writing" as const,
    minutes: 23,
    sentences: source.sentences.map((item) => ({
      id: item.id,
      speakerLine: item.speakerLine,
      tokens: scrambleTokens(item.tokens, item.id),
    })),
    email: { minutes: 7, scenario: source.email.scenario, points: source.email.points },
    discussion: { minutes: 10, professor: source.discussion.professor, studentA: source.discussion.studentA, studentB: source.discussion.studentB },
  };
}

export function normalizeWritingScores(raw: z.infer<typeof ieltsWritingScoreSchema>, words: { task1: number; task2: number }) {
  const task1 = {
    taskAchievement: halfBand(raw.task1.task_achievement),
    coherence: halfBand(raw.task1.coherence),
    lexical: halfBand(raw.task1.lexical),
    grammar: halfBand(raw.task1.grammar),
    comment: raw.task1.comment,
    missedPoints: raw.task1.missed_points || [],
    coveredPoints: raw.task1.covered_points || [],
    words: words.task1,
    underMinimum: words.task1 < 150,
  };
  const task2 = {
    taskResponse: halfBand(raw.task2.task_achievement),
    coherence: halfBand(raw.task2.coherence),
    lexical: halfBand(raw.task2.lexical),
    grammar: halfBand(raw.task2.grammar),
    comment: raw.task2.comment,
    missedPoints: raw.task2.missed_points || [],
    coveredPoints: raw.task2.covered_points || [],
    words: words.task2,
    underMinimum: words.task2 < 250,
  };
  const task1Overall = halfBand((task1.taskAchievement + task1.coherence + task1.lexical + task1.grammar) / 4);
  const task2Overall = halfBand((task2.taskResponse + task2.coherence + task2.lexical + task2.grammar) / 4);
  const overall = halfBand((task1Overall + task2Overall * 2) / 3);
  return {
    scale: "ielts-writing-band",
    overall,
    task1: { ...task1, overall: task1Overall },
    task2: { ...task2, overall: task2Overall },
    note: "Task 2 is weighted twice Task 1. Reference only, not an official result.",
  };
}

export function normalizeToeflWriting(
  raw: z.infer<typeof toeflWritingScoreSchema>,
  sentenceCorrect: number,
  words: { email: number; discussion: number }
) {
  const email = taskScore(raw.email.score);
  const discussion = taskScore(raw.discussion.score);
  const rawTotal = sentenceCorrect + email + discussion;
  const total = 10 + 5 + 5;
  return {
    scale: "toefl-writing-1-6",
    band: toeflSectionBand(rawTotal, total),
    sentences: { correct: sentenceCorrect, total: 10 },
    email: {
      score: email,
      comment: raw.email.comment,
      words: words.email,
      missedPoints: raw.email.missed_points || [],
      coveredPoints: raw.email.covered_points || [],
    },
    discussion: {
      score: discussion,
      comment: raw.discussion.comment,
      words: words.discussion,
      missedPoints: raw.discussion.missed_points || [],
      coveredPoints: raw.discussion.covered_points || [],
    },
    note: "Build a Sentence is marked right or wrong. Email and discussion use a 0 to 5 study rubric, excluding nothing the writing criteria cover. Not an official equated score.",
  };
}

export function scoreSentenceOrder(paper: ToeflWritingPaper, answers: Record<string, string[]>): number {
  return paper.sentences.filter((item) => {
    const given = answers[item.id] || [];
    return given.join(" ").replace(/\s+/g, " ").trim() === item.tokens.join(" ").replace(/\s+/g, " ").trim();
  }).length;
}
