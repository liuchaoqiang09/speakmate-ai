import { callDeepSeek } from "@/src/lib/ai/deepseek";
import {
  ieltsReadingSchema,
  ieltsWritingSchema,
  toeflReadingSchema,
  toeflWritingSchema,
  type IeltsReadingPaper,
  type IeltsWritingPaper,
  type ToeflReadingPaper,
  type ToeflWritingPaper,
} from "@/src/lib/exam/paperContent";

function parseJson(raw: string): unknown {
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

async function askJson(instruction: string): Promise<unknown> {
  const result = await callDeepSeek(
    [
      { role: "system", content: "Return only valid JSON. No markdown." },
      { role: "user", content: instruction },
    ],
    { timeoutMs: 90000, temperature: 0.4 }
  );
  if (!result.success || !result.data) {
    throw new Error(result.error || "生成试卷失败");
  }
  return parseJson(result.data.content);
}

async function askValid<T>(
  instruction: string,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } } },
  repair?: (value: unknown) => unknown
): Promise<T> {
  let last = "试卷结构无效";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await askJson(attempt === 0 ? instruction : `${instruction}\nReturn shorter JSON. Use the exact type names and answer spellings from the instructions.`);
      const parsed = schema.safeParse(repair ? repair(raw) : raw);
      if (parsed.success) {
        return parsed.data;
      }
      last = parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.map(String).join(".") || "paper"}: ${issue.message}`)
        .join("；");
    } catch (error) {
      last = error instanceof Error ? error.message : last;
    }
  }
  throw new Error(last || "试卷结构无效");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeType(value: unknown): string {
  const text = asText(value).toLowerCase().replace(/[\s/-]+/g, "_");
  if (["tfng", "true_false_not_given", "true_false_ng", "identifying_information"].includes(text)) {
    return "true_false_not_given";
  }
  if (["ynng", "yes_no_not_given", "yes_no_ng", "identifying_views"].includes(text)) {
    return "yes_no_not_given";
  }
  if (["multiple_choice", "mc", "mcq", "choice"].includes(text)) {
    return "multiple_choice";
  }
  if (["completion", "sentence_completion", "summary_completion", "note_completion"].includes(text)) {
    return "completion";
  }
  if (["matching_heading", "matching_headings", "headings", "heading"].includes(text)) {
    return "matching_heading";
  }
  return text;
}

function judgement(value: unknown, kind: "tf" | "yn"): string | null {
  const text = asText(value).toLowerCase().replace(/[_/]/g, " ").replace(/\s+/g, " ");
  if (kind === "tf") {
    if (text === "true" || text === "t") return "True";
    if (text === "false" || text === "f") return "False";
  } else {
    if (text === "yes" || text === "y") return "Yes";
    if (text === "no" || text === "n") return "No";
  }
  if (text.includes("not given") || text === "ng") return "Not Given";
  return null;
}

function explain(value: unknown, fallback: string): string {
  return asText(value).slice(0, 240) || fallback;
}

function repairQuestion(value: unknown, index: number): unknown | null {
  const record = asRecord(value);
  if (!record) return null;
  const type = normalizeType(record.type);
  const id = asText(record.id) || `q${index + 1}`;
  const prompt = asText(record.prompt || record.question);
  if (type === "multiple_choice") {
    const options = Array.isArray(record.options) ? record.options.map(asText).filter(Boolean).slice(0, 4) : [];
    if (options.length < 3) return null;
    let answer = asText(record.answer);
    const letter = answer.toUpperCase();
    if (letter.length === 1 && letter >= "A" && letter <= "D") {
      answer = options[letter.charCodeAt(0) - 65] || "";
    }
    if (!options.includes(answer)) return null;
    return { id, type, prompt: prompt || "Choose the correct answer.", options, answer, explanation: explain(record.explanation, `The passage points to this option: ${answer}.`) };
  }
  if (type === "true_false_not_given" || type === "yes_no_not_given") {
    const answer = judgement(record.answer, type === "true_false_not_given" ? "tf" : "yn");
    if (!answer || !prompt) return null;
    return {
      id,
      type,
      prompt,
      answer,
      explanation: explain(
        record.explanation,
        answer === "Not Given" ? "The passage does not state this." : `The passage supports ${answer}.`
      ),
    };
  }
  if (type === "completion") {
    const answer = asText(record.answer);
    const limit = Number(record.wordLimit ?? record.word_limit ?? 2);
    if (!answer || !prompt) return null;
    return {
      id,
      type,
      prompt,
      wordLimit: Number.isFinite(limit) ? Math.min(3, Math.max(1, Math.round(limit))) : 2,
      answer,
      explanation: explain(record.explanation, `The missing words are ${answer}.`),
    };
  }
  if (type === "matching_heading") {
    const paragraph = asText(record.paragraph || record.label).slice(0, 4);
    const answer = asText(record.answer || record.heading);
    if (!paragraph || !answer) return null;
    return { id, type, paragraph, answer, explanation: explain(record.explanation, `Paragraph ${paragraph} matches heading ${answer}.`) };
  }
  return null;
}

function repairPassage(value: unknown): unknown {
  const root = asRecord(value);
  const source = root && Array.isArray(root.passages) ? asRecord(root.passages[0]) : root;
  if (!source) return value;
  const rawParagraphs = Array.isArray(source.paragraphs) ? source.paragraphs : [];
  const paragraphs = rawParagraphs
    .map((item, index) => {
      if (typeof item === "string") {
        return { label: String.fromCharCode(65 + index), text: item.trim() };
      }
      const record = asRecord(item);
      if (!record) return null;
      return { label: asText(record.label).slice(0, 4) || String.fromCharCode(65 + index), text: asText(record.text) };
    })
    .filter((item): item is { label: string; text: string } => Boolean(item && item.text.length >= 40))
    .slice(0, 6);
  const headings = Array.isArray(source.headings)
    ? source.headings
        .map((item) => {
          const record = asRecord(item);
          if (!record) return null;
          const id = asText(record.id);
          const text = asText(record.text);
          return id && text ? { id, text } : null;
        })
        .filter((item): item is { id: string; text: string } => Boolean(item))
    : undefined;
  const headingIds = new Set((headings || []).map((item) => item.id));
  const questions = (Array.isArray(source.questions) ? source.questions : [])
    .map(repairQuestion)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .filter((item) => item.type !== "matching_heading" || headingIds.has(String(item.answer)))
    .slice(0, 12);
  return {
    passages: [
      {
        title: asText(source.title) || "Reading passage",
        paragraphs,
        headings,
        questions,
      },
    ],
  };
}

function repairChoiceList(value: unknown): unknown[] {
  return (Array.isArray(value) ? value : [])
    .map((item, index) => repairQuestion({ ...(asRecord(item) || {}), type: "multiple_choice" }, index))
    .filter(Boolean) as unknown[];
}

function repairToefl(setId: string, value: unknown): unknown {
  const root = asRecord(value) || {};
  if (setId === "complete_words") {
    const block = asRecord(root.completeWords) || root;
    const blanks = (Array.isArray(block.blanks) ? block.blanks : [])
      .map((item, index) => {
        const record = asRecord(item);
        if (!record) return null;
        const prefix = asText(record.prefix);
        const answer = asText(record.answer);
        if (!prefix || !answer) return null;
        return {
          id: asText(record.id) || `b${index + 1}`,
          prefix,
          answer,
          explanation: explain(record.explanation, `The missing ending is ${answer}.`),
        };
      })
      .filter(Boolean)
      .slice(0, 10);
    return { completeWords: { sentence: asText(block.sentence), blanks } };
  }
  if (setId === "daily_life") {
    const list = Array.isArray(root.dailyLife) ? root.dailyLife : [root];
    const dailyLife = list
      .map((item) => {
        const record = asRecord(item);
        if (!record) return null;
        const questions = repairChoiceList(record.questions).slice(0, 3);
        return { title: asText(record.title) || "Campus notice", body: asText(record.body), questions };
      })
      .filter((item) => item && item.body.length >= 20 && item.questions.length >= 2)
      .slice(0, 2);
    return { dailyLife };
  }
  const block = asRecord(root.academic) || root;
  const paragraphs = (Array.isArray(block.paragraphs) ? block.paragraphs : []).map(asText).filter((item) => item.length >= 40).slice(0, 5);
  return {
    academic: {
      title: asText(block.title) || "Academic passage",
      paragraphs,
      questions: repairChoiceList(block.questions).slice(0, 8),
    },
  };
}

const IELTS_SET_PROMPT: Record<string, string> = {
  passage1: "Difficulty: easier factual article. Questions: 4 type true_false_not_given with answer True, False, or Not Given. 3 type completion with wordLimit 2 and a _____ blank. 3 type multiple_choice with exactly 4 options. No headings.",
  passage2: "Difficulty: medium explanatory article. Include headings with ids i, ii, iii, iv, v, vi and two of them unused. Questions: 4 type matching_heading whose answer is a heading id and paragraph is A, B, C, or D. 3 type yes_no_not_given with answer Yes, No, or Not Given. 3 type multiple_choice with exactly 4 options.",
  passage3: "Difficulty: harder argument article. Questions: 4 type yes_no_not_given with answer Yes, No, or Not Given. 3 type completion for a summary, wordLimit 2, prompt contains _____. 3 type multiple_choice with exactly 4 options. No headings.",
};

export async function generateIeltsReading(setId = "passage1"): Promise<IeltsReadingPaper> {
  const brief = IELTS_SET_PROMPT[setId] || IELTS_SET_PROMPT.passage1;
  return askValid(
    [
      "Write ONE original IELTS Academic Reading passage. Do not copy a published test.",
      "4 paragraphs labeled A B C D. Each paragraph is 80 to 120 words.",
      brief,
      "Every multiple_choice answer must be copied exactly from its options.",
      "Return JSON: { title, paragraphs: [{label, text}], headings?: [{id, text}], questions: [{id, type, prompt, options?, wordLimit?, paragraph?, answer}] }",
    ].join("\n"),
    ieltsReadingSchema,
    repairPassage
  );
}

export async function generateToeflReading(setId = "complete_words"): Promise<ToeflReadingPaper> {
  const prompts: Record<string, string> = {
    complete_words: "Only Complete the Words. One academic sentence of about 35 words shown with prefixes, like The libr___ opens early. 8 blanks: {id, prefix, answer}. answer is only the missing ending. JSON: { completeWords: { sentence, blanks } }",
    daily_life: "Only Read in Daily Life. One campus notice or email, 80 to 140 words, and 3 multiple_choice questions. Each question has exactly 4 options and answer copied from those options. JSON: { dailyLife: [{ title, body, questions: [{id, type:\"multiple_choice\", prompt, options, answer}] }] }",
    academic: "Only one academic passage, harder than a notice. 4 paragraphs of about 80 words. 6 multiple_choice questions covering main idea, detail, inference, vocabulary, and purpose. Exactly 4 options each. answer copied from options. JSON: { academic: { title, paragraphs: [string], questions } }",
  };
  return askValid(
    [
      "Write an original TOEFL iBT 2026 reading task. Do not copy published items.",
      prompts[setId] || prompts.complete_words,
    ].join("\n"),
    toeflReadingSchema,
    (value) => repairToefl(setId, value)
  );
}

function cellText(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return asText(value);
}

function repairIeltsWriting(value: unknown): unknown {
  const root = asRecord(value);
  if (!root) {
    return value;
  }
  const task1 = asRecord(root.task1) || {};
  const table = asRecord(task1.table) || {};
  const columns = (Array.isArray(table.columns) ? table.columns : []).map(cellText).filter(Boolean).slice(0, 4);
  const rows = (Array.isArray(table.rows) ? table.rows : [])
    .map((row) => (Array.isArray(row) ? row.map(cellText).filter((cell) => cell.length > 0).slice(0, 4) : []))
    .filter((row) => row.length >= 2)
    .slice(0, 6);
  const task2 = asRecord(root.task2) || (typeof root.task2 === "string" ? { prompt: root.task2 } : {});
  return {
    task1: { prompt: asText(task1.prompt), table: { columns, rows } },
    task2: { prompt: asText(task2.prompt) },
  };
}

export async function generateIeltsWriting(): Promise<IeltsWritingPaper> {
  return askValid(
    [
      "Write an original IELTS Academic Writing paper.",
      "Task 1: the candidate must describe a table in at least 150 words. Include a table with 3 columns and 4 rows of simple numbers. The prompt tells them to summarise the information and make comparisons.",
      "Task 2: one essay question that asks for an opinion and reasons, at least 250 words.",
      "Do not copy published questions.",
      "JSON: { task1: { prompt, table: { columns, rows } }, task2: { prompt } }",
    ].join("\n"),
    ieltsWritingSchema,
    repairIeltsWriting
  );
}

function repairToeflWriting(value: unknown): unknown {
  const root = asRecord(value);
  if (!root) {
    return value;
  }
  const sentences = (Array.isArray(root.sentences) ? root.sentences : [])
    .map((item, index) => {
      const record = asRecord(item);
      if (!record) {
        return null;
      }
      const tokens = (Array.isArray(record.tokens) ? record.tokens : []).map(cellText).filter(Boolean).slice(0, 10);
      const id = cellText(record.id) || `s${index + 1}`;
      const speakerLine = asText(record.speakerLine || record.speaker_line);
      if (!speakerLine || tokens.length < 4) {
        return null;
      }
      return { id, speakerLine, tokens };
    })
    .filter((item): item is { id: string; speakerLine: string; tokens: string[] } => Boolean(item))
    .slice(0, 10);
  const email = asRecord(root.email) || {};
  const discussion = asRecord(root.discussion) || {};
  const points = (Array.isArray(email.points) ? email.points : []).map(cellText).filter(Boolean).slice(0, 4);
  return {
    sentences,
    email: { scenario: asText(email.scenario), points },
    discussion: {
      professor: asText(discussion.professor),
      studentA: asText(discussion.studentA || discussion.student_a),
      studentB: asText(discussion.studentB || discussion.student_b),
    },
  };
}

export async function generateToeflWriting(): Promise<ToeflWritingPaper> {
  return askValid(
    [
      "Write an original TOEFL iBT Writing practice set using the 2026 tasks.",
      "sentences: exactly 10 items. Each has a speakerLine and tokens. tokens in the given order are the correct grammatical reply. 5 to 8 tokens.",
      "email: a campus scenario and 3 points the writer must cover. The real task allows 7 minutes.",
      "discussion: a professor question plus two student opinions that disagree. The candidate must state and support their own view.",
      "Do not copy published items.",
      "JSON: { sentences: [{id, speakerLine, tokens}], email: {scenario, points}, discussion: {professor, studentA, studentB} }",
    ].join("\n"),
    toeflWritingSchema,
    repairToeflWriting
  );
}
