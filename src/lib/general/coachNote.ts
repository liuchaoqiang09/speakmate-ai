import { prisma } from "@/src/lib/db/prisma";

export function buildCoachNote(focus?: string | null, phrases?: string | null): string {
  const parts: string[] = [];
  const focusText = focus?.trim() || "";
  const phraseText = phrases?.trim() || "";
  if (focusText) {
    parts.push(`This round must target: ${focusText}`);
  }
  if (phraseText) {
    parts.push(`Help the learner actually say these phrases: ${phraseText}`);
  }
  return parts.join(" ").slice(0, 800);
}

export async function saveCoachNote(sessionId: string, note: string): Promise<void> {
  const text = note.trim();
  if (!text) {
    return;
  }
  await prisma.$executeRaw`
    UPDATE practice_sessions
    SET coach_note = ${text}
    WHERE id = ${sessionId}::uuid
  `;
}

export async function readCoachNote(sessionId: string): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ coach_note: string | null }>>`
    SELECT coach_note
    FROM practice_sessions
    WHERE id = ${sessionId}::uuid
  `;
  return rows[0]?.coach_note?.trim() || "";
}
