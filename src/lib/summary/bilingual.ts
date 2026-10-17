export type BilingualNote = {
  en: string;
  zh: string;
};

export type BilingualFeedback = {
  id: string;
  category: string;
  originalText: string;
  originalZh: string;
  correctedText: string;
  correctedZh: string;
  explanation: string;
  explanationZh: string;
  naturalText: string;
  naturalZh: string;
  advancedText: string;
  advancedZh: string;
};

export type BilingualPhrase = {
  phrase: string;
  meaning_zh: string;
  example: string;
  example_zh: string;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function asBilingualNotes(value: unknown): BilingualNote[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const notes: BilingualNote[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      notes.push({ en: item.trim(), zh: "" });
      continue;
    }
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const en = readString(record.en) || readString(record.text);
    const zh = readString(record.zh);
    if (en) {
      notes.push({ en, zh });
    }
  }
  return notes;
}

export function normalizeBilingualNotes(value: unknown): BilingualNote[] {
  return asBilingualNotes(value).map((item) => ({
    en: item.en,
    zh: item.zh,
  }));
}

export function asBilingualFeedback(value: unknown): BilingualFeedback[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: BilingualFeedback[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const id = readString(record.id);
    const originalText = readString(record.originalText);
    const correctedText = readString(record.correctedText);
    const explanation = readString(record.explanation);
    if (!id || !originalText || !correctedText || !explanation) {
      continue;
    }
    let naturalText = "";
    let naturalZh = "";
    let advancedText = "";
    let advancedZh = "";
    const severity = readString(record.severity);
    if (severity.startsWith("{")) {
      try {
        const packed = JSON.parse(severity) as Record<string, unknown>;
        naturalText = readString(packed.natural);
        naturalZh = readString(packed.naturalZh);
        advancedText = readString(packed.advanced);
        advancedZh = readString(packed.advancedZh);
      } catch {
        naturalText = "";
      }
    }
    items.push({
      id,
      category: readString(record.category),
      originalText,
      originalZh: readString(record.originalZh),
      correctedText,
      correctedZh: readString(record.correctedZh),
      explanation,
      explanationZh: readString(record.explanationZh),
      naturalText,
      naturalZh,
      advancedText,
      advancedZh,
    });
  }
  return items;
}

export function asBilingualPhrases(value: unknown): BilingualPhrase[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const phrases: BilingualPhrase[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const phrase = readString(record.phrase);
    const meaning = readString(record.meaning_zh);
    const example = readString(record.example);
    const exampleZh = readString(record.example_zh);
    if (phrase && meaning && example) {
      phrases.push({
        phrase,
        meaning_zh: meaning,
        example,
        example_zh: exampleZh,
      });
    }
  }
  return phrases;
}
