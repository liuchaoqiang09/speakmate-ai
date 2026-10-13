-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('general', 'exam');

-- CreateEnum
CREATE TYPE "PracticeStatus" AS ENUM ('in_progress', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'mastered', 'later');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "display_name" TEXT,
    "english_level" TEXT,
    "learning_goal" TEXT,
    "preferred_feedback_language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mode" "PracticeMode" NOT NULL,
    "exam_type" TEXT,
    "topic" TEXT,
    "difficulty" TEXT,
    "feedback_mode" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "status" "PracticeStatus" NOT NULL DEFAULT 'in_progress',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content_text" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "language_feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "message_id" UUID,
    "category" TEXT NOT NULL,
    "original_text" TEXT NOT NULL,
    "corrected_text" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "severity" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "language_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_summaries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "strengths" JSONB NOT NULL,
    "key_errors" JSONB NOT NULL,
    "useful_phrases" JSONB NOT NULL,
    "next_practice_focus" JSONB NOT NULL,
    "data_confidence" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_profiles" (
    "user_id" UUID NOT NULL,
    "current_focus" TEXT,
    "estimated_level" TEXT,
    "level_confidence" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "skill_metrics" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "skill_key" TEXT NOT NULL,
    "metric_value" DECIMAL(10,4) NOT NULL,
    "sample_count" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_feedback_id" UUID,
    "item_type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "expected_answer" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "due_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_sessions_user_id_idx" ON "practice_sessions"("user_id");

-- CreateIndex
CREATE INDEX "practice_sessions_user_id_created_at_idx" ON "practice_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "conversation_messages_user_id_idx" ON "conversation_messages"("user_id");

-- CreateIndex
CREATE INDEX "conversation_messages_session_id_idx" ON "conversation_messages"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_messages_session_id_sequence_number_key" ON "conversation_messages"("session_id", "sequence_number");

-- CreateIndex
CREATE INDEX "language_feedback_user_id_idx" ON "language_feedback"("user_id");

-- CreateIndex
CREATE INDEX "language_feedback_session_id_idx" ON "language_feedback"("session_id");

-- CreateIndex
CREATE INDEX "language_feedback_message_id_idx" ON "language_feedback"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_summaries_session_id_key" ON "session_summaries"("session_id");

-- CreateIndex
CREATE INDEX "session_summaries_user_id_idx" ON "session_summaries"("user_id");

-- CreateIndex
CREATE INDEX "skill_metrics_user_id_skill_key_idx" ON "skill_metrics"("user_id", "skill_key");

-- CreateIndex
CREATE INDEX "skill_metrics_user_id_period_start_period_end_idx" ON "skill_metrics"("user_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "review_items_user_id_status_due_at_idx" ON "review_items"("user_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "review_items_source_feedback_id_idx" ON "review_items"("source_feedback_id");

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language_feedback" ADD CONSTRAINT "language_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language_feedback" ADD CONSTRAINT "language_feedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language_feedback" ADD CONSTRAINT "language_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "conversation_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_profiles" ADD CONSTRAINT "learning_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_metrics" ADD CONSTRAINT "skill_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_source_feedback_id_fkey" FOREIGN KEY ("source_feedback_id") REFERENCES "language_feedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;
