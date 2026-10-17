export type ReadingSet = {
  id: string;
  exam: "ielts" | "toefl";
  label: string;
  labelZh: string;
  minutes: number;
  types: string;
};

export const READING_SETS: ReadingSet[] = [
  {
    id: "passage1",
    exam: "ielts",
    label: "Passage 1",
    labelZh: "较易 · 事实说明",
    minutes: 20,
    types: "True / False / Not Given, sentence completion, multiple choice",
  },
  {
    id: "passage2",
    exam: "ielts",
    label: "Passage 2",
    labelZh: "中等 · 解释说明",
    minutes: 20,
    types: "Matching headings, Yes / No / Not Given, multiple choice",
  },
  {
    id: "passage3",
    exam: "ielts",
    label: "Passage 3",
    labelZh: "较难 · 观点论证",
    minutes: 20,
    types: "Yes / No / Not Given, summary completion, multiple choice",
  },
  {
    id: "complete_words",
    exam: "toefl",
    label: "Complete the Words",
    labelZh: "补全单词",
    minutes: 8,
    types: "Finish the missing part of each word",
  },
  {
    id: "daily_life",
    exam: "toefl",
    label: "Read in Daily Life",
    labelZh: "日常短文",
    minutes: 10,
    types: "A notice or email, then multiple choice",
  },
  {
    id: "academic",
    exam: "toefl",
    label: "Academic Passage",
    labelZh: "学术文章 · 较难",
    minutes: 18,
    types: "Main idea, detail, inference, vocabulary, purpose",
  },
];

export function readingSetsFor(exam: string): ReadingSet[] {
  return READING_SETS.filter((item) => item.exam === exam);
}

export function findReadingSet(exam: string, setId: string | null | undefined): ReadingSet {
  const sets = readingSetsFor(exam);
  return sets.find((item) => item.id === setId) || sets[0];
}
