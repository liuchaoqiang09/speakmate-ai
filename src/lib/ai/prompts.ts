export type ConversationPromptInput = {
  mode: "general" | "exam";
  examType?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  feedbackMode?: string | null;
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

function examGuide(examType?: string | null, topic?: string | null): string {
  const exam = (examType || "").toLowerCase();
  const part = (topic || "").toLowerCase();

  if (exam === "ielts") {
    if (part === "part1") {
      return "This is IELTS Speaking Part 1 practice: short questions about familiar everyday topics. Ask one question at a time and wait for the answer.";
    }
    if (part === "part2") {
      return "This is IELTS Speaking Part 2 practice: the learner should speak at length on one personal topic. Give a cue-card style prompt, then listen. Ask at most one follow-up if needed.";
    }
    if (part === "part3") {
      return "This is IELTS Speaking Part 3 practice: a deeper discussion of more abstract ideas. Ask one thoughtful question at a time.";
    }
    return "This is IELTS speaking practice. Follow a natural examiner-like conversation, but you are a practice partner, not an official examiner.";
  }

  if (exam === "toefl") {
    return [
      "This is TOEFL speaking practice.",
      "Do not invent official TOEFL task numbers, timers, or scores, because the current official task types have not been verified in this product yet.",
      "Hold a structured English speaking practice related to academic or campus situations.",
      "Any comment on performance is only AI study advice, not an official TOEFL score.",
    ].join(" ");
  }

  return "This is exam-style speaking practice. Stay in English and keep the task focused.";
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
      ...sharedRules,
      examGuide(input.examType, input.topic),
      `Stay on the selected exam practice focus: ${topic}.`,
    ].join("\n");
  }

  return [
    ...sharedRules,
    `The conversation topic or scene is: ${topic}.`,
    "Keep the chat relevant to this topic unless the learner clearly changes it.",
  ].join("\n");
}
