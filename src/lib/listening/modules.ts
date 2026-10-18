export const LISTENING_LEVELS = [
  { id: "初级", hint: "语速慢，词汇简单，约 80 词" },
  { id: "中级", hint: "自然语速，有一个转折，约 110 词" },
  { id: "高级", hint: "稍快，信息更密，约 140 词" },
] as const;

export type ListeningGroup = "daily" | "ielts" | "toefl" | "cet4" | "cet6";

export type ListeningModule = {
  id: string;
  group: ListeningGroup;
  label: string;
  labelZh: string;
  difficulty: string;
  examLabel: string;
  rulesZh: string;
  playOnce: boolean;
  voiceLang: "en-GB" | "en-US";
  defaultRate: number;
  questionsMin: number;
  questionsMax: number;
  prompt: string;
};

export const LISTENING_GROUPS: Array<{ id: ListeningGroup; labelZh: string }> = [
  { id: "daily", labelZh: "日常听力" },
  { id: "ielts", labelZh: "雅思听力" },
  { id: "toefl", labelZh: "托福听力" },
  { id: "cet4", labelZh: "英语四级" },
  { id: "cet6", labelZh: "英语六级" },
];

export const LISTENING_MODULES: ListeningModule[] = [
  {
    id: "campus",
    group: "daily",
    label: "Campus",
    labelZh: "校园通知",
    difficulty: "初级",
    examLabel: "日常听力",
    rulesZh: "听完做主旨、细节、填空、判断。可调语速，可再听。",
    playOnce: false,
    voiceLang: "en-US",
    defaultRate: 0.9,
    questionsMin: 3,
    questionsMax: 5,
    prompt: "",
  },
  {
    id: "travel",
    group: "daily",
    label: "Travel",
    labelZh: "出行问路",
    difficulty: "初级",
    examLabel: "日常听力",
    rulesZh: "听完做主旨、细节、填空、判断。可调语速，可再听。",
    playOnce: false,
    voiceLang: "en-US",
    defaultRate: 0.9,
    questionsMin: 3,
    questionsMax: 5,
    prompt: "",
  },
  {
    id: "daily",
    group: "daily",
    label: "Daily chat",
    labelZh: "日常对话",
    difficulty: "初级",
    examLabel: "日常听力",
    rulesZh: "听完做主旨、细节、填空、判断。可调语速，可再听。",
    playOnce: false,
    voiceLang: "en-US",
    defaultRate: 0.9,
    questionsMin: 3,
    questionsMax: 5,
    prompt: "",
  },
  {
    id: "work",
    group: "daily",
    label: "Work",
    labelZh: "工作沟通",
    difficulty: "中级",
    examLabel: "日常听力",
    rulesZh: "听完做主旨、细节、填空、判断。可调语速，可再听。",
    playOnce: false,
    voiceLang: "en-US",
    defaultRate: 0.9,
    questionsMin: 3,
    questionsMax: 5,
    prompt: "",
  },
  {
    id: "service",
    group: "daily",
    label: "Service",
    labelZh: "预约和服务",
    difficulty: "初级",
    examLabel: "日常听力",
    rulesZh: "听完做主旨、细节、填空、判断。可调语速，可再听。",
    playOnce: false,
    voiceLang: "en-US",
    defaultRate: 0.9,
    questionsMin: 3,
    questionsMax: 5,
    prompt: "",
  },
  {
    id: "ielts_s1",
    group: "ielts",
    label: "Section 1",
    labelZh: "Section 1 日常对话",
    difficulty: "初级",
    examLabel: "IELTS Listening · Section 1",
    rulesZh:
      "两人社交对话（预约、报名、问路）。10 题：表格/笔记填空 + 三选一。答案不超过两个词和/或一个数字。录音只放一遍。",
    playOnce: true,
    voiceLang: "en-GB",
    defaultRate: 0.95,
    questionsMin: 10,
    questionsMax: 10,
    prompt: [
      "Write ONE IELTS Academic Listening Section 1 item. Inspired by IELTS, NOT an official paper.",
      "Audio: a transactional conversation between TWO speakers (phone or face-to-face): booking, joining a club, lost property, or accommodation.",
      "British or Australian everyday English. Concrete facts: names (spell one name), phone/postcode, time, price, date.",
      "script: 260 to 340 words, labeled as Clerk: and Customer: or similar.",
      "Difficulty: easiest IELTS section. Clear numbers and spellings. One small distractor (speaker corrects a time).",
      "questions: exactly 10.",
      "q1-q7 type gap. prompt is a form line like 'Membership fee: ______'. Answer ONE WORD AND/OR A NUMBER taken from the script.",
      "q8-q10 type choice with exactly 3 options A) B) C).",
      "instructions: Complete the form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    ].join(" "),
  },
  {
    id: "ielts_s2",
    group: "ielts",
    label: "Section 2",
    labelZh: "Section 2 独白介绍",
    difficulty: "中级",
    examLabel: "IELTS Listening · Section 2",
    rulesZh:
      "一人独白，介绍旅游点、活动或设施。填空 + 匹配/三选一。录音只放一遍。比 Section 1 稍难。",
    playOnce: true,
    voiceLang: "en-GB",
    defaultRate: 1,
    questionsMin: 10,
    questionsMax: 10,
    prompt: [
      "Write ONE IELTS Academic Listening Section 2 item. Inspired by IELTS, NOT an official paper.",
      "Audio: ONE speaker monologue: a guided tour, local event, museum, sports centre, or volunteer project.",
      "script: 280 to 360 words. Use a host voice, no dialogue labels except optional 'Guide:'.",
      "Difficulty: IELTS Section 2. Natural pace, one contrast (old vs new / this year vs last year).",
      "questions: exactly 10.",
      "q1-q5 type gap, NO MORE THAN TWO WORDS AND/OR A NUMBER.",
      "q6-q10 type choice with exactly 3 options A) B) C), matching places/features to statements.",
      "instructions: Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.",
    ].join(" "),
  },
  {
    id: "ielts_s3",
    group: "ielts",
    label: "Section 3",
    labelZh: "Section 3 学术讨论",
    difficulty: "高级",
    examLabel: "IELTS Listening · Section 3",
    rulesZh:
      "2–3 人学术讨论（学生做课题、和导师开会）。三选一 + 匹配观点。难度明显高于前两节。录音只放一遍。",
    playOnce: true,
    voiceLang: "en-GB",
    defaultRate: 1,
    questionsMin: 10,
    questionsMax: 10,
    prompt: [
      "Write ONE IELTS Academic Listening Section 3 item. Inspired by IELTS, NOT an official paper.",
      "Audio: academic discussion, TWO or THREE speakers (two students and optionally a tutor) about a project, presentation, survey, or dissertation.",
      "script: 300 to 380 words. Label speakers Tutor:, Lisa:, Tom: etc.",
      "Difficulty: IELTS Section 3. Speakers disagree, hedge, and change their minds. Academic but spoken.",
      "questions: exactly 10.",
      "All questions type choice with exactly 3 options A) B) C).",
      "Cover: who will do what, a problem they found, a method, and a tutor's advice.",
      "Do not make answers obvious from the question wording.",
      "instructions: Choose the correct letter, A, B or C.",
    ].join(" "),
  },
  {
    id: "ielts_s4",
    group: "ielts",
    label: "Section 4",
    labelZh: "Section 4 学术讲座",
    difficulty: "高级",
    examLabel: "IELTS Listening · Section 4",
    rulesZh:
      "一人学术讲座。笔记填空为主。词汇和信息密度最高，录音只放一遍。",
    playOnce: true,
    voiceLang: "en-GB",
    defaultRate: 1.02,
    questionsMin: 10,
    questionsMax: 10,
    prompt: [
      "Write ONE IELTS Academic Listening Section 4 item. Inspired by IELTS, NOT an official paper.",
      "Audio: an academic lecture by ONE professor on biology, history, environment, psychology, or technology.",
      "script: 320 to 420 words. Lecture English with signposting (first / however / in conclusion).",
      "Difficulty: hardest IELTS listening section. Dense facts, two examples, one unexpected finding.",
      "questions: exactly 10, all type gap.",
      "Each prompt is a lecture-note heading plus a gap, like 'Main cause of decline: ______'.",
      "Answers are 1 or 2 words AND/OR a number from the lecture. No more than TWO WORDS.",
      "instructions: Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.",
    ].join(" "),
  },
  {
    id: "toefl_conversation",
    group: "toefl",
    label: "Conversation",
    labelZh: "校园对话 Conversation",
    difficulty: "中级",
    examLabel: "TOEFL iBT Listening · Conversation",
    rulesZh:
      "学生和教授/行政人员的校园对话，约 3 分钟。固定 5 题四选一：主旨、细节、功能、态度、推断。录音只放一遍。",
    playOnce: true,
    voiceLang: "en-US",
    defaultRate: 1,
    questionsMin: 5,
    questionsMax: 5,
    prompt: [
      "Write ONE TOEFL iBT Listening campus CONVERSATION. Inspired by TOEFL, NOT an official test.",
      "Audio: a student and a professor OR office staff (registrar, librarian, advisor). Campus problem and a resolution.",
      "script: 220 to 280 words. Label Student: and Professor: or Clerk:.",
      "American academic spoken English. Include a reason the student came, a policy constraint, and next step.",
      "Difficulty: real TOEFL conversation. Indirect answers, one attitude shift.",
      "questions: exactly 5, all type choice with exactly 4 options A) B) C) D).",
      "q1 gist-purpose: Why does the student go to see the professor/staff?",
      "q2 detail.",
      "q3 function: Why does the woman/man say: quote a short line from the script.",
      "q4 attitude.",
      "q5 inference: What will the student probably do next?",
      "instructions: Listen to a conversation. Then answer the questions. Choose one answer.",
    ].join(" "),
  },
  {
    id: "toefl_lecture",
    group: "toefl",
    label: "Lecture",
    labelZh: "学术讲座 Lecture",
    difficulty: "高级",
    examLabel: "TOEFL iBT Listening · Lecture",
    rulesZh:
      "教授课堂讲座，可有学生插问。固定 6 题四选一：主旨、组织结构、细节、关联信息、推断。录音只放一遍。比对话更难。",
    playOnce: true,
    voiceLang: "en-US",
    defaultRate: 1.02,
    questionsMin: 6,
    questionsMax: 6,
    prompt: [
      "Write ONE TOEFL iBT Listening academic LECTURE. Inspired by TOEFL, NOT an official test.",
      "Audio: a professor lecture in biology, geology, art history, psychology, or astronomy. Optionally one brief student question.",
      "script: 260 to 340 words. Label Professor: and optional Student:.",
      "Difficulty: real TOEFL lecture. Define a concept, two examples, one contrast, a research finding.",
      "questions: exactly 6, all type choice with exactly 4 options A) B) C) D).",
      "Must include: gist-content, organization (why the professor mentions X), two details, connecting content, inference.",
      "instructions: Listen to part of a lecture. Then answer the questions.",
    ].join(" "),
  },
  {
    id: "cet4_news",
    group: "cet4",
    label: "News",
    labelZh: "新闻报道 News reports",
    difficulty: "中级",
    examLabel: "CET-4 Listening · News reports",
    rulesZh:
      "四级 Section A：短新闻。2–3 题，四选一。VOA/BBC 新闻口吻，事实清楚。录音只放一遍。",
    playOnce: true,
    voiceLang: "en-US",
    defaultRate: 0.95,
    questionsMin: 2,
    questionsMax: 3,
    prompt: [
      "Write ONE CET-4 (大学英语四级) listening NEWS REPORT. Inspired by CET-4, NOT an official paper.",
      "Audio: one short news item (campus, city, science, or public service). Neutral broadcast English.",
      "script: 90 to 130 words. One narrator. Include who/what/where/when and one number.",
      "Difficulty: CET-4 news, not CET-6. High-frequency vocabulary. Clear facts.",
      "questions: exactly 3, all type choice with exactly 4 options A) B) C) D) in CET stem style.",
      "Questions in English: main idea, a stated detail, a number/time/reason.",
      "answer must match one option exactly.",
      "instructions: Questions 1 to 3. Choose the best answer from A, B, C and D.",
    ].join(" "),
  },
  {
    id: "cet4_conversation",
    group: "cet4",
    label: "Long conversation",
    labelZh: "长对话 Long conversations",
    difficulty: "中级",
    examLabel: "CET-4 Listening · Long conversations",
    rulesZh:
      "四级 Section B：一组长对话，4 题四选一。问地点、关系、原因、接下来做什么。录音只放一遍。",
    playOnce: true,
    voiceLang: "en-US",
    defaultRate: 0.95,
    questionsMin: 4,
    questionsMax: 4,
    prompt: [
      "Write ONE CET-4 long conversation. Inspired by CET-4, NOT an official paper.",
      "Audio: M: and W: on campus, job, travel, or daily life in China-relevant but English setting.",
      "script: 180 to 240 words. Include a problem, two details, and a decision.",
      "Difficulty: CET-4 conversation. Everyday vocabulary, one implied meaning.",
      "questions: exactly 4, all type choice, exactly 4 options A) B) C) D).",
      "CET stems: What are the speakers talking about? Where? Why? What will the man/woman do?",
      "instructions: Questions 1 to 4. Choose the best answer from A, B, C and D.",
    ].join(" "),
  },
  {
    id: "cet4_passage",
    group: "cet4",
    label: "Passage",
    labelZh: "听力短文 Passages",
    difficulty: "中级",
    examLabel: "CET-4 Listening · Passages",
    rulesZh:
      "四级 Section C：短文理解，3–4 题四选一。记叙或说明，主旨 + 细节。录音只放一遍。",
    playOnce: true,
    voiceLang: "en-US",
    defaultRate: 0.95,
    questionsMin: 3,
    questionsMax: 4,
    prompt: [
      "Write ONE CET-4 listening PASSAGE. Inspired by CET-4, NOT an official paper.",
      "Audio: one short talk or story (education, health, culture, or a person's experience).",
      "script: 160 to 220 words. One speaker.",
      "Difficulty: CET-4 passage. Clear structure: opening, two facts, closing comment.",
      "questions: exactly 4, all type choice, exactly 4 options A) B) C) D).",
      "Cover main idea, a detail, a reason, and what can be inferred.",
      "instructions: Questions 1 to 4. Choose the best answer from A, B, C and D.",
    ].join(" "),
  },
  {
    id: "cet6_conversation",
    group: "cet6",
    label: "Long conversation",
    labelZh: "长对话 Long conversations",
    difficulty: "高级",
    examLabel: "CET-6 Listening · Long conversations",
    rulesZh:
      "六级长对话，4 题四选一。语速和信息密度高于四级，有观点转折。录音只放一遍。",
    playOnce: true,
    voiceLang: "en-US",
    defaultRate: 1.05,
    questionsMin: 4,
    questionsMax: 4,
    prompt: [
      "Write ONE CET-6 long conversation. Inspired by CET-6, NOT an official paper.",
      "Audio: M: and W: on research, internship, workplace, or social issue.",
      "script: 240 to 300 words. Include disagreement, data, and a plan.",
      "Difficulty: harder than CET-4. Faster ideas, implied attitude, one idiom.",
      "questions: exactly 4, all type choice, exactly 4 options A) B) C) D).",
      "Cover main topic, a detail, inference, and the speakers' decision.",
      "instructions: Questions 1 to 4. Choose the best answer from A, B, C and D.",
    ].join(" "),
  },
  {
    id: "cet6_passage",
    group: "cet6",
    label: "Passage",
    labelZh: "听力短文 Passages",
    difficulty: "高级",
    examLabel: "CET-6 Listening · Passages",
    rulesZh:
      "六级短文，3–4 题四选一。说明文或议论文，细节更密。录音只放一遍。",
    playOnce: true,
    voiceLang: "en-US",
    defaultRate: 1.05,
    questionsMin: 3,
    questionsMax: 4,
    prompt: [
      "Write ONE CET-6 listening PASSAGE. Inspired by CET-6, NOT an official paper.",
      "Audio: an expository talk (science, society, education, economy).",
      "script: 220 to 280 words.",
      "Difficulty: CET-6. Abstract idea plus two concrete examples. One contrast.",
      "questions: exactly 4, all type choice, exactly 4 options A) B) C) D).",
      "Cover main idea, supporting detail, speaker's purpose, inference.",
      "instructions: Questions 1 to 4. Choose the best answer from A, B, C and D.",
    ].join(" "),
  },
  {
    id: "cet6_lecture",
    group: "cet6",
    label: "Lecture / talk",
    labelZh: "讲座讲话 Lectures/talks",
    difficulty: "高级",
    examLabel: "CET-6 Listening · Lectures/talks",
    rulesZh:
      "六级 Section C：讲座或讲话，4 题四选一。学术口吻，最难一档。录音只放一遍。",
    playOnce: true,
    voiceLang: "en-US",
    defaultRate: 1.08,
    questionsMin: 4,
    questionsMax: 4,
    prompt: [
      "Write ONE CET-6 lecture or talk. Inspired by CET-6, NOT an official paper.",
      "Audio: a university talk or public lecture. One speaker, academic but spoken.",
      "script: 250 to 320 words.",
      "Difficulty: hardest CET-6 listening. Concept, evidence, implication.",
      "questions: exactly 4, all type choice, exactly 4 options A) B) C) D).",
      "Cover main idea, a research finding, organization, and the speaker's conclusion.",
      "instructions: Questions 1 to 4. Choose the best answer from A, B, C and D.",
    ].join(" "),
  },
];

export const LISTENING_TOPICS = LISTENING_MODULES.map((item) => ({
  id: item.id,
  label: item.label,
  labelZh: item.labelZh,
  group: item.group,
}));

export type ListeningTopicId = (typeof LISTENING_MODULES)[number]["id"];

export type ListeningPaperSlot = {
  moduleId: string;
  questions?: number;
};

export type ListeningPaper = {
  id: string;
  group: Exclude<ListeningGroup, "daily">;
  labelZh: string;
  examLabel: string;
  rulesZh: string;
  slots: ListeningPaperSlot[];
};

export const LISTENING_PAPERS: ListeningPaper[] = [
  {
    id: "ielts_paper",
    group: "ielts",
    labelZh: "雅思听力整卷",
    examLabel: "IELTS Listening",
    rulesZh: "Section 1 到 4 连着考，每部分 10 题，共 40 题。每段录音只放一遍，不能回头重听。四段都听完再交卷。",
    slots: [
      { moduleId: "ielts_s1", questions: 10 },
      { moduleId: "ielts_s2", questions: 10 },
      { moduleId: "ielts_s3", questions: 10 },
      { moduleId: "ielts_s4", questions: 10 },
    ],
  },
  {
    id: "toefl_paper",
    group: "toefl",
    labelZh: "托福听力整卷",
    examLabel: "TOEFL Listening",
    rulesZh: "2 段校园对话（各 5 题）和 3 段讲座（各 6 题）按顺序听。每段只放一遍，全部听完再交卷。",
    slots: [
      { moduleId: "toefl_conversation", questions: 5 },
      { moduleId: "toefl_conversation", questions: 5 },
      { moduleId: "toefl_lecture", questions: 6 },
      { moduleId: "toefl_lecture", questions: 6 },
      { moduleId: "toefl_lecture", questions: 6 },
    ],
  },
  {
    id: "cet4_paper",
    group: "cet4",
    labelZh: "四级听力整卷",
    examLabel: "CET-4 Listening",
    rulesZh: "3 条新闻（2+2+3 题）、2 段长对话（各 4 题）、3 篇短文（3+4+3 题），共 25 题。只放一遍，按顺序听完再交卷。",
    slots: [
      { moduleId: "cet4_news", questions: 2 },
      { moduleId: "cet4_news", questions: 2 },
      { moduleId: "cet4_news", questions: 3 },
      { moduleId: "cet4_conversation", questions: 4 },
      { moduleId: "cet4_conversation", questions: 4 },
      { moduleId: "cet4_passage", questions: 3 },
      { moduleId: "cet4_passage", questions: 4 },
      { moduleId: "cet4_passage", questions: 3 },
    ],
  },
  {
    id: "cet6_paper",
    group: "cet6",
    labelZh: "六级听力整卷",
    examLabel: "CET-6 Listening",
    rulesZh: "2 段长对话（各 4 题）、2 篇短文（3+4 题）、3 段讲座（3+3+4 题），共 25 题。只放一遍，按顺序听完再交卷。",
    slots: [
      { moduleId: "cet6_conversation", questions: 4 },
      { moduleId: "cet6_conversation", questions: 4 },
      { moduleId: "cet6_passage", questions: 3 },
      { moduleId: "cet6_passage", questions: 4 },
      { moduleId: "cet6_lecture", questions: 3 },
      { moduleId: "cet6_lecture", questions: 3 },
      { moduleId: "cet6_lecture", questions: 4 },
    ],
  },
];

export function getListeningPaper(id: string): ListeningPaper | undefined {
  return LISTENING_PAPERS.find((item) => item.id === id);
}

export function getListeningModule(id: string): ListeningModule | undefined {
  if (id === "cet4") {
    return LISTENING_MODULES.find((item) => item.id === "cet4_conversation");
  }
  if (id === "cet6") {
    return LISTENING_MODULES.find((item) => item.id === "cet6_conversation");
  }
  return LISTENING_MODULES.find((item) => item.id === id);
}

export function listeningTopicLabel(topic: string): string {
  const paper = getListeningPaper(topic);
  if (paper) {
    return paper.examLabel;
  }
  const listeningModule = getListeningModule(topic);
  if (!listeningModule) {
    return topic;
  }
  return listeningModule.group === "daily" ? listeningModule.labelZh : `${listeningModule.examLabel}`;
}

export function isExamListening(topic: string): boolean {
  const group = getListeningModule(topic)?.group;
  return group === "ielts" || group === "toefl" || group === "cet4" || group === "cet6";
}

export function isCetTopic(topic: string): boolean {
  const group = getListeningModule(topic)?.group;
  return group === "cet4" || group === "cet6" || topic === "cet4" || topic === "cet6";
}
