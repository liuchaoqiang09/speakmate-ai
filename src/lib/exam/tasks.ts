export type ExamId = "ielts" | "toefl";

export type ExamPartId =
  | "part1"
  | "part2"
  | "part3"
  | "listen_repeat"
  | "interview"
  | "task1";

export type ExamChoice = {
  exam: ExamId;
  part: Exclude<ExamPartId, "task1">;
  label: string;
  labelZh: string;
};

export const EXAM_CHOICES: ExamChoice[] = [
  { exam: "ielts", part: "part1", label: "Part 1", labelZh: "问答" },
  { exam: "ielts", part: "part2", label: "Part 2", labelZh: "陈述" },
  { exam: "ielts", part: "part3", label: "Part 3", labelZh: "讨论" },
  { exam: "toefl", part: "listen_repeat", label: "Listen and Repeat", labelZh: "听后复述" },
  { exam: "toefl", part: "interview", label: "Take an Interview", labelZh: "访谈" },
];

type CueCard = {
  title: string;
  points: string[];
};

const CUE_CARDS: CueCard[] = [
  {
    title: "Describe a place you like to visit",
    points: ["where it is", "how often you go there", "what you do there", "and explain why you like it"],
  },
  {
    title: "Describe a person who taught you something useful",
    points: ["who this person is", "what they taught you", "how they taught it", "and explain why it was useful"],
  },
  {
    title: "Describe a skill you would like to learn",
    points: ["what the skill is", "how you would learn it", "how difficult it would be", "and explain why you want to learn it"],
  },
  {
    title: "Describe a meal you remember well",
    points: ["where you had it", "who you were with", "what you ate", "and explain why you remember it"],
  },
  {
    title: "Describe a time you helped someone",
    points: ["who you helped", "what you did", "how they reacted", "and explain how you felt"],
  },
  {
    title: "Describe an app or website you often use",
    points: ["what it is", "how you use it", "how often you use it", "and explain why it is useful"],
  },
  {
    title: "Describe a goal you have for the next year",
    points: ["what the goal is", "why it matters", "how you will work on it", "and explain what might be difficult"],
  },
  {
    title: "Describe a journey that took longer than you expected",
    points: ["where you went", "why it was delayed", "what you did while waiting", "and explain what you learned"],
  },
];

const REPEAT_SENTENCES = [
  "The library opens at eight.",
  "Please bring your student card.",
  "You can borrow books for two weeks.",
  "Group study rooms are on the second floor.",
  "If a book is already out, you can place a hold online.",
  "The writing center offers free appointments on weekday afternoons.",
  "Please return books to the desk by the main entrance before the library closes.",
];

const INTERVIEWS = [
  {
    scene: "a short campus interview about your studies",
    questions: [
      "What are you studying, and why did you choose it?",
      "Tell me about a class or project you enjoyed.",
      "Some people think universities should require community service. What do you think?",
      "How can a university help students who are using a second language?",
    ],
  },
  {
    scene: "a short interview for a student club",
    questions: [
      "Which club are you interested in, and why?",
      "Tell me about a time you worked with other people.",
      "Should student clubs spend more time on events or on community projects?",
      "What would you do if members disagreed about a plan?",
    ],
  },
];

export type ExamTaskScript = {
  exam: ExamId;
  part: Exclude<ExamPartId, "task1">;
  heading: string;
  headingZh: string;
  limit: string;
  limitZh: string;
  /** 页面上立即可见的英语开场 */
  announcement: string;
  welcome: string;
  systemRole: string;
  clock: "part1" | "part2" | "part3" | "repeat" | "interview";
};

function stableIndex(seed: string, size: number): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }
  return size === 0 ? 0 : hash % size;
}

export function normalizeExamPart(exam: string, part: string): { exam: ExamId; part: Exclude<ExamPartId, "task1"> } | null {
  const examId = exam.trim().toLowerCase();
  const partId = part.trim().toLowerCase();
  if (examId === "ielts" && (partId === "part1" || partId === "part2" || partId === "part3")) {
    return { exam: "ielts", part: partId };
  }
  if (examId === "toefl" && (partId === "listen_repeat" || partId === "interview")) {
    return { exam: "toefl", part: partId };
  }
  if (examId === "toefl" && partId === "task1") {
    return { exam: "toefl", part: "interview" };
  }
  return null;
}

function formatCard(card: CueCard): string {
  return `${card.title}. You should say: ${card.points.join("; ")}`;
}

export function buildExamTask(exam: string, part: string, seed: string): ExamTaskScript | null {
  const normalized = normalizeExamPart(exam, part);
  if (!normalized) {
    return null;
  }

  const shared = [
    "You are the examiner in a mock speaking test.",
    "Speak only in English.",
    "Do not teach, hint, or correct during the test.",
    "Do not give a score during the test.",
    "Do not discuss pronunciation or accent.",
    "Keep a calm examiner tone.",
  ].join(" ");

  if (normalized.part === "part1") {
    const welcome =
      "This is the IELTS Speaking test, Part 1. I will ask you some questions about yourself and familiar topics. Let's begin. Do you work, or are you a student?";
    return {
      exam: "ielts",
      part: "part1",
      heading: "IELTS Part 1",
      headingZh: "日常问答",
      limit: "About 4 to 5 minutes · one question at a time",
      limitZh: "约 4 到 5 分钟，一次只问一个问题",
      announcement: welcome,
      welcome,
      clock: "part1",
      systemRole: [
        shared,
        "This is IELTS Speaking Part 1 only.",
        "Ask short questions about home, work or study, and familiar habits.",
        "Ask one question at a time and wait.",
        "Expect a short answer, then move to a new question.",
        "Stay in Part 1 for about five minutes.",
        "Your first spoken line must tell the candidate this is IELTS Speaking Part 1.",
      ].join(" "),
    };
  }

  if (normalized.part === "part2") {
    const card = CUE_CARDS[stableIndex(seed, CUE_CARDS.length)];
    const spokenCard = formatCard(card);
    const welcome = `This is the IELTS Speaking test, Part 2. ${spokenCard}. You have one minute to prepare. I will stay quiet. Then please speak for one to two minutes.`;
    return {
      exam: "ielts",
      part: "part2",
      heading: "IELTS Part 2",
      headingZh: "个人陈述",
      limit: "1 minute to prepare · 1 to 2 minutes to speak",
      limitZh: "准备 1 分钟，陈述 1 到 2 分钟",
      announcement: welcome,
      welcome,
      clock: "part2",
      systemRole: [
        shared,
        "This is IELTS Speaking Part 2 only.",
        `The cue card is fixed: ${spokenCard}.`,
        "After you read the card, stay silent during the one-minute preparation.",
        "Do not interrupt the long turn.",
        "When the candidate finishes, or after about two minutes, ask one short rounding-off question, then stop.",
        "Do not start Part 3.",
      ].join(" "),
    };
  }

  if (normalized.part === "part3") {
    const welcome =
      "This is the IELTS Speaking test, Part 3. I will ask you some more general questions. Please explain your ideas. Let's begin. Why do people like to visit new places?";
    return {
      exam: "ielts",
      part: "part3",
      heading: "IELTS Part 3",
      headingZh: "深入讨论",
      limit: "About 4 to 5 minutes · explain and give reasons",
      limitZh: "约 4 到 5 分钟，需要解释和给理由",
      announcement: welcome,
      welcome,
      clock: "part3",
      systemRole: [
        shared,
        "This is IELTS Speaking Part 3 only.",
        "Ask abstract follow-up questions about places, learning, or daily life.",
        "Ask the candidate to explain, compare, or give reasons.",
        "Ask one question at a time.",
        "If an answer is very short, ask one brief why-question, then move on.",
        "Stay in Part 3 for about five minutes.",
      ].join(" "),
    };
  }

  if (normalized.part === "listen_repeat") {
    const lines = REPEAT_SENTENCES.map((sentence, index) => `${index + 1}. ${sentence}`).join(" ");
    const welcome = `This is the TOEFL Speaking Listen and Repeat task. I will say seven sentences. After each one, repeat it exactly. Do not add your own ideas. Sentence one. ${REPEAT_SENTENCES[0]}`;
    return {
      exam: "toefl",
      part: "listen_repeat",
      heading: "TOEFL Listen and Repeat",
      headingZh: "听后复述",
      limit: "7 sentences · repeat each one exactly",
      limitZh: "共 7 句，听到后原句复述",
      announcement:
        "This is the TOEFL Speaking Listen and Repeat task. I will say seven sentences. After each one, repeat it exactly. The words appear after you repeat them.",
      welcome,
      clock: "repeat",
      systemRole: [
        shared,
        "This is the TOEFL Listen and Repeat task from the current Speaking section.",
        "Say the sentences below in order, one at a time.",
        "After each sentence, wait for the candidate to repeat it.",
        "Do not chat, explain, or correct.",
        "After the seventh repeat, say the task is complete and stop.",
        lines,
      ].join(" "),
    };
  }

  const interview = INTERVIEWS[stableIndex(seed, INTERVIEWS.length)];
  const welcome = `This is the TOEFL Speaking Take an Interview task. This is ${interview.scene}. I will ask four questions. Answer each one in about forty-five seconds. Let's begin. ${interview.questions[0]}`;
  return {
    exam: "toefl",
    part: "interview",
    heading: "TOEFL Take an Interview",
    headingZh: "模拟访谈",
    limit: "4 questions · about 45 seconds each",
    limitZh: "4 个问题，每题约 45 秒",
    announcement: welcome,
    welcome,
    clock: "interview",
    systemRole: [
      shared,
      "This is the TOEFL Take an Interview task from the current Speaking section.",
      `The scene is ${interview.scene}.`,
      "Ask these four questions in order, one at a time.",
      "After each answer, move to the next question.",
      "Do not coach.",
      "After the fourth answer, say the interview is complete and stop.",
      interview.questions.map((question, index) => `${index + 1}. ${question}`).join(" "),
    ].join(" "),
  };
}

export function examScoreKind(exam: string, part: string): "ielts" | "toefl_repeat" | "toefl_interview" | null {
  const normalized = normalizeExamPart(exam, part);
  if (!normalized) {
    return null;
  }
  if (normalized.exam === "ielts") {
    return "ielts";
  }
  if (normalized.part === "listen_repeat") {
    return "toefl_repeat";
  }
  return "toefl_interview";
}
