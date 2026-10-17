import { buildExamTask, normalizeExamPart } from "@/src/lib/exam/tasks";

/** 考试练习页标题，例如 “IELTS Part 1”。 */
export function examPartLabel(exam: string, part: string): string | null {
  const normalized = normalizeExamPart(exam, part);
  if (!normalized) {
    return null;
  }
  return buildExamTask(normalized.exam, normalized.part, "label")?.heading ?? null;
}

export function examModeLabel(mode: string): string | null {
  if (mode === "practice") {
    return "练习模式";
  }
  if (mode === "simulation") {
    return "Mock · 模拟";
  }
  return null;
}
