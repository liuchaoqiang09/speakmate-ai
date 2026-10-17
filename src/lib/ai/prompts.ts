import { buildExamTask, examScoreKind } from "@/src/lib/exam/tasks";
import { generalScene } from "@/src/lib/general/scenes";

export type ConversationPromptInput = {
  mode: "general" | "exam";
  examType?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  feedbackMode?: string | null;
  coachNote?: string | null;
};

function difficultyGuide(difficulty?: string | null): string {
  if (difficulty === "初级") {
    return "Use simple, common vocabulary and short sentences. Speak slowly and clearly. The learner is a beginner.";
  }
  if (difficulty === "高级") {
    return "You may use richer vocabulary and more natural spoken English. The learner is advanced, but still keep questions focused.";
  }
  return "Use everyday vocabulary and moderately complex sentences. The learner is at an intermediate level.";
}

function feedbackGuide(feedbackMode?: string | null): string {
  if (feedbackMode === "each") {
    return [
      "After the learner replies, you may give a very brief correction (one or two sentences) if there is an important mistake.",
      "Then continue the conversation with one main question.",
      "Do not give a long grammar lecture.",
    ].join(" ");
  }

  return [
    "Prioritize a natural conversation. Do not interrupt with long corrections.",
    "If the learner asks for help, you may offer a more natural way to say something in one short sentence.",
    "Detailed corrections will be provided after the session ends, so do not summarize errors every turn.",
  ].join(" ");
}

/** 考试对话角色提示。part 存在练习会话的 topic 字段里。 */
function examRolePrompt(examType?: string | null, part?: string | null): string {
  const script = buildExamTask(examType || "", part || "", "text");
  if (script) {
    return script.systemRole;
  }
  return "You are an English speaking examiner for the selected task. Ask one question at a time. Do not give a score during the test.";
}

const EXAM_SHARED_RULES = [
  "Feedback is AI-assisted learning advice, NOT an official exam score.",
  "Do not give, estimate, or pretend to give an official IELTS or TOEFL score.",
  "Use natural English. Do not be wordy.",
  "Ask only one question at a time.",
  "Do not correct at length during the conversation. Detailed feedback is given after the session ends.",
].join("\n");

function summaryExamFocus(sessionContext: SummarySessionContext): string | null {
  const kind = examScoreKind(sessionContext.examType || "", sessionContext.topic || "");
  if (!kind) {
    return null;
  }

  const shared = [
    "Also return reference_score.",
    "This is an AI reference for study, not an official result.",
    "Do not score accent, pronunciation, intelligibility, rhythm, or intonation.",
    "Judge only what the transcript shows.",
  ];

  if (kind === "ielts") {
    return [
      "This is an IELTS Speaking mock for one part.",
      "Score Fluency and coherence, Lexical resource, and Grammatical range and accuracy.",
      "Use public IELTS band ideas from 0 to 9 in half-band steps.",
      "Band 7 speaks at length with flexible wording and frequent error-free sentences.",
      "Band 6 is willing to speak at length but loses coherence and mixes simple and complex grammar.",
      "Band 5 keeps going with repetition, limited wording, and limited complex grammar.",
      "Band 4 pauses often and relies on basic sentences.",
      ...shared,
      'reference_score.kind must be "ielts".',
    ].join(" ");
  }

  if (kind === "toefl_repeat") {
    return [
      "This is the TOEFL Listen and Repeat task.",
      "Score 0 to 5 on how completely and accurately the learner repeated the words and meaning.",
      "A 5 repeats the sentence. A 3 keeps most ideas but changes or drops important words. A 1 keeps only a few words.",
      "Ignore accent.",
      ...shared,
      'reference_score.kind must be "toefl_repeat".',
    ].join(" ");
  }

  return [
    "This is the TOEFL Take an Interview task.",
    "Score 0 to 5 on whether the answer fits the question, is elaborated, keeps a conversational pace, and uses adequate grammar and vocabulary.",
    "A 5 is on topic, developed, and linguistically clear. A 3 is on topic but thin or uneven. A 1 barely connects to the question.",
    "Ignore accent, pronunciation, rhythm, and intonation.",
    ...shared,
    'reference_score.kind must be "toefl_interview".',
  ].join(" ");
}

function summaryScoreExample(sessionContext: SummarySessionContext): unknown {
  const kind = examScoreKind(sessionContext.examType || "", sessionContext.topic || "");
  if (kind === "ielts") {
    return {
      kind: "ielts",
      fluency_coherence: 6,
      lexical_resource: 6,
      grammatical_range: 6,
      fluency_comment: "short note",
      lexical_comment: "short note",
      grammar_comment: "short note",
    };
  }
  if (kind === "toefl_repeat") {
    return {
      kind: "toefl_repeat",
      task_score: 4,
      comment: "how complete the repeats were",
    };
  }
  if (kind === "toefl_interview") {
    return {
      kind: "toefl_interview",
      task_score: 4,
      topic_comment: "short note",
      pace_comment: "short note",
      language_comment: "short note",
    };
  }
  return null;
}

/**
 * 根据练习设置生成系统提示词（给模型的英文指令）。
 */
export function buildConversationPrompt(input: ConversationPromptInput): string {
  const topic = input.topic?.trim() || "everyday conversation";
  const sharedRules = [
    "You are a friendly, patient English conversation partner for SpeakMate AI.",
    "Speak in natural, everyday English.",
    "Ask mainly one question at a time. Do not stack several questions in one turn.",
    "Continue based on what the learner actually said. Do not ignore their answer or use a fixed script.",
    "Never shame, mock, or scold the learner for mistakes.",
    "Do not pretend to be an official IELTS or TOEFL examiner, and do not give official band scores.",
    difficultyGuide(input.difficulty),
    feedbackGuide(input.feedbackMode),
  ];

  if (input.mode === "exam") {
    return [
      examRolePrompt(input.examType, input.topic),
      EXAM_SHARED_RULES,
      "Never shame, mock, or scold the learner for mistakes.",
      "Continue based on what the learner actually said.",
      feedbackGuide(input.feedbackMode),
      input.coachNote?.trim() || "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const scene = generalScene(topic, input.difficulty);
  return [
    ...sharedRules,
    scene.role,
    "Keep the chat inside this scene unless the learner clearly changes it.",
    input.coachNote?.trim() ? input.coachNote.trim() : "",
    "Do not mark the goals out loud. Weave them into the conversation.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type SummaryMessage = {
  role: string;
  contentText: string;
};

export type SummarySessionContext = {
  mode: string;
  topic?: string | null;
  difficulty?: string | null;
  examType?: string | null;
  feedbackMode?: string | null;
};

/**
 * 生成练习总结提示词，要求模型只返回可校验的 JSON。
 */
export function buildSummaryPrompt(
  messages: SummaryMessage[],
  sessionContext: SummarySessionContext
): string {
  const transcript = messages
    .map((item, index) => {
      const speaker = item.role === "assistant" ? "AI" : "LEARNER";
      return `${index + 1}. ${speaker}: ${item.contentText}`;
    })
    .join("\n");

  const scene = sessionContext.mode === "general" ? generalScene(sessionContext.topic, sessionContext.difficulty) : null;
  const modelAnswerGuide =
    sessionContext.topic === "part2"
      ? "model_answer is a 140 to 180 word monologue a stronger candidate could give for this same cue card."
      : "model_answer is a stronger sample for the weakest part of this performance, under 120 words.";

  return [
    "You are an English speaking coach for SpeakMate AI.",
    "Your task is to analyze ONE practice session and return STRICT JSON only.",
    "Do not wrap the JSON in markdown. Do not add commentary before or after the JSON.",
    "This is AI study advice only. A reference_score is a study estimate, never an official result.",
    summaryExamFocus(sessionContext) ||
      "This is general conversation. Always return speaking_score on a 1 to 5 scale.",
    "Always score the speaking performance and give bilingual study advice. This is required after every session with enough learner speech.",
    "speaking_score uses 1-5 for completeness, grammar, vocabulary, interaction, and development.",
    "completeness: did the learner answer the question. development: did they add a reason or example. interaction: did they keep the conversation going.",
    "advice_en and advice_zh must be concrete next-step coaching, not generic praise.",
    "Only quote or correct sentences the LEARNER actually said. Do not invent learner utterances.",
    "Beginners need Chinese. Every correction, key error, strength, next-focus item, and example sentence must include Simplified Chinese.",
    "Keep learner quotes and corrected English in English. Put the Chinese meaning in the matching _zh fields.",
    "explanation is a short English note. explanation_zh must say in Chinese where the sentence went wrong.",
    "Each correction needs three English versions: corrected (accurate), natural (spoken), advanced (stronger).",
    sessionContext.topic === "part2"
      ? "For Part 2, comment on structure: point, reason, example, closing. If the turn was under 40 seconds, say so."
      : "",
    "If evidence is weak, set data_confidence to insufficient and use empty arrays. Still return advice_zh telling the learner to speak longer next time.",
    `Practice mode: ${sessionContext.mode}`,
    `Topic: ${sessionContext.topic || "unspecified"}`,
    `Difficulty: ${sessionContext.difficulty || "unspecified"}`,
    `Exam type: ${sessionContext.examType || "none"}`,
    `Feedback mode: ${sessionContext.feedbackMode || "unspecified"}`,
    scene ? `Scene goals. Copy a goal into goals_met only if the learner achieved it, using the exact text: ${scene.goals.join(" | ")}` : "goals_met can be an empty array.",
    modelAnswerGuide,
    "band_note is one sentence describing what this score level usually sounds like.",
    "next_practice_focus must be concrete tasks for the next round, such as one missing scene goal or one repeated grammar slip.",
    "Transcript:",
    transcript || "(no messages)",
    "Return JSON with this exact shape:",
    JSON.stringify({
      corrections: [
        {
          original: "exact learner words",
          original_zh: "原句中文意思",
          corrected: "accurate English",
          corrected_zh: "正确句子的中文意思",
          natural: "more natural spoken English",
          natural_zh: "自然口语句中文",
          advanced: "stronger exam-ready English",
          advanced_zh: "更高一档中文",
          category: "grammar|vocabulary|collocation|fluency",
          explanation: "short English explanation",
          explanation_zh: "用中文说明错在哪里",
        },
      ],
      useful_phrases: [
        {
          phrase: "phrase from this session",
          meaning_zh: "中文含义",
          example: "one example sentence",
          example_zh: "例句中文",
        },
      ],
      strengths: [{ en: "what the learner did well", zh: "优点的中文" }],
      key_errors: [{ en: "main issue in English", zh: "问题的中文" }],
      next_practice_focus: [{ en: "one concrete next task", zh: "下次练习的中文" }],
      goals_met: ["exact goal text the learner achieved"],
      model_answer: "stronger sample",
      band_note: "what this level usually sounds like",
      data_confidence: "sufficient|insufficient",
      advice_en: "one concrete coaching plan in English",
      advice_zh: "对应的中文学习建议",
      speaking_score: {
        completeness: 4,
        grammar: 3,
        vocabulary: 3,
        interaction: 4,
        development: 3,
        overall: 3,
        completeness_comment: "short note",
        completeness_comment_zh: "中文",
        grammar_comment: "short note",
        grammar_comment_zh: "中文",
        vocabulary_comment: "short note",
        vocabulary_comment_zh: "中文",
        interaction_comment: "short note",
        interaction_comment_zh: "中文",
        development_comment: "short note",
        development_comment_zh: "中文",
      },
      reference_score: summaryScoreExample(sessionContext),
    }),
  ].join("\n");
}
