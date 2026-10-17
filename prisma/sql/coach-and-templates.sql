ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS coach_note TEXT;

CREATE TABLE IF NOT EXISTS exam_paper_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type TEXT NOT NULL,
  skill TEXT NOT NULL,
  set_id TEXT NOT NULL DEFAULT '',
  public_content JSONB NOT NULL,
  answer_key JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exam_paper_templates_lookup
  ON exam_paper_templates (exam_type, skill, set_id, created_at DESC);
