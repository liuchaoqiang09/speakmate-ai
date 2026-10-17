export type ScoreComment = {
  en: string;
  zh: string;
};

export type SpeakingDimension = {
  key: string;
  label: string;
  labelZh: string;
  score: number;
  comment: ScoreComment;
};

export type SpeakingScoreCard = {
  kind: "speaking" | "ielts" | "toefl_repeat" | "toefl_interview";
  overall: number;
  scale: "5" | "9";
  advice: ScoreComment;
  dimensions: SpeakingDimension[];
  modelAnswer: string;
  bandNote: string;
  goalsMet: string[];
};

function asScore(value: unknown, max: number): number | null {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return null;
  }
  if (max === 9) {
    const rounded = Math.round(numberValue * 2) / 2;
    return rounded < 0 || rounded > 9 ? null : rounded;
  }
  const rounded = Math.round(numberValue);
  return rounded < 0 || rounded > max ? null : rounded;
}

function text(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function comment(record: Record<string, unknown>, enKey: string, zhKey: string): ScoreComment {
  return { en: text(record, enKey), zh: text(record, zhKey) };
}

function dimension(
  record: Record<string, unknown>,
  key: string,
  label: string,
  labelZh: string,
  scoreKey: string,
  max: number
): SpeakingDimension | null {
  const score = asScore(record[scoreKey], max);
  if (score === null) {
    return null;
  }
  return {
    key,
    label,
    labelZh,
    score,
    comment: comment(record, `${key}_comment`, `${key}_comment_zh`),
  };
}

/**
 * 从总结 JSON 里读出口语各维度分数。考试分和日常分都走这里。
 */
export function readSpeakingScore(raw: unknown): SpeakingScoreCard | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const nested =
    record.speaking && typeof record.speaking === "object"
      ? (record.speaking as Record<string, unknown>)
      : record;
  const advice: ScoreComment = {
    en: text(record, "adviceEn") || text(record, "advice_en") || text(nested, "advice_en"),
    zh: text(record, "adviceZh") || text(record, "advice_zh") || text(nested, "advice_zh"),
  };
  const modelAnswer = text(record, "modelAnswer") || text(record, "model_answer");
  const bandNote = text(record, "bandNote") || text(record, "band_note");
  const goalsMet = Array.isArray(record.goalsMet)
    ? record.goalsMet.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  if (record.kind === "ielts") {
    const fluency = asScore(record.fluencyCoherence ?? nested.fluency_coherence, 9);
    const lexical = asScore(record.lexicalResource ?? nested.lexical_resource, 9);
    const grammar = asScore(record.grammaticalRange ?? nested.grammatical_range, 9);
    if (fluency === null || lexical === null || grammar === null) {
      return null;
    }
    const overall =
      asScore(record.overall, 9) ?? Math.round(((fluency + lexical + grammar) / 3) * 2) / 2;
    const extra = [
      dimension(nested, "completeness", "Completeness", "完整度", "completeness", 5),
      dimension(nested, "development", "Development", "展开", "development", 5),
      dimension(nested, "interaction", "Interaction", "互动", "interaction", 5),
    ].filter((item): item is SpeakingDimension => Boolean(item));
    return {
      kind: "ielts",
      overall,
      scale: "9",
      advice,
      modelAnswer,
      bandNote,
      goalsMet,
      dimensions: [
        {
          key: "fluency",
          label: "Fluency and coherence",
          labelZh: "流畅与连贯",
          score: fluency,
          comment: {
            en: text(record, "fluencyComment") || text(nested, "fluency_comment"),
            zh: text(nested, "fluency_comment_zh"),
          },
        },
        {
          key: "lexical",
          label: "Lexical resource",
          labelZh: "词汇",
          score: lexical,
          comment: {
            en: text(record, "lexicalComment") || text(nested, "lexical_comment"),
            zh: text(nested, "lexical_comment_zh"),
          },
        },
        {
          key: "grammar",
          label: "Grammatical range",
          labelZh: "语法",
          score: grammar,
          comment: {
            en: text(record, "grammarComment") || text(nested, "grammar_comment"),
            zh: text(nested, "grammar_comment_zh"),
          },
        },
        ...extra,
      ],
    };
  }

  if (record.kind === "toefl_repeat" || record.kind === "toefl_interview") {
    const taskScore = asScore(record.taskScore ?? nested.task_score, 5);
    if (taskScore === null) {
      return null;
    }
    return {
      kind: record.kind,
      overall: taskScore,
      scale: "5",
      advice,
      modelAnswer,
      bandNote,
      goalsMet,
      dimensions: [
        {
          key: "task",
          label: record.kind === "toefl_repeat" ? "Repeat accuracy" : "Interview task",
          labelZh: record.kind === "toefl_repeat" ? "复述完整度" : "访谈任务",
          score: taskScore,
          comment: {
            en: text(record, "comment") || text(nested, "comment"),
            zh: text(nested, "comment_zh"),
          },
        },
        ...[
          dimension(nested, "topic", "Topic", "切题", "topic", 5) ||
            (text(record, "topicComment")
              ? {
                  key: "topic",
                  label: "Topic",
                  labelZh: "切题",
                  score: taskScore,
                  comment: { en: text(record, "topicComment"), zh: "" },
                }
              : null),
          dimension(nested, "pace", "Pace", "节奏", "pace", 5),
          dimension(nested, "language", "Language", "语言", "language", 5),
        ].filter((item): item is SpeakingDimension => Boolean(item)),
      ],
    };
  }

  const dimensions = [
    dimension(nested, "completeness", "Completeness", "完整度", "completeness", 5),
    dimension(nested, "grammar", "Grammar", "语法", "grammar", 5),
    dimension(nested, "vocabulary", "Vocabulary", "词汇", "vocabulary", 5),
    dimension(nested, "interaction", "Interaction", "互动", "interaction", 5),
    dimension(nested, "development", "Development", "展开", "development", 5),
  ].filter((item): item is SpeakingDimension => Boolean(item));

  if (dimensions.length === 0 && !advice.en && !advice.zh) {
    return null;
  }

  const overall =
    asScore(nested.overall ?? record.overall, 5) ??
    (dimensions.length
      ? Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length)
      : 0);

  return {
    kind: "speaking",
    overall,
    scale: "5",
    advice,
    modelAnswer,
    bandNote,
    goalsMet,
    dimensions,
  };
}

export function compactScore(raw: unknown): string {
  const score = readSpeakingScore(raw);
  if (!score) {
    return "";
  }
  return score.scale === "9" ? score.overall.toFixed(1) : String(score.overall);
}
