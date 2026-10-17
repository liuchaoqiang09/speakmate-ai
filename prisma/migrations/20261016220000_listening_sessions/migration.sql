-- CreateTable
CREATE TABLE "listening_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "public_content" JSONB NOT NULL,
    "answer_key" JSONB NOT NULL,
    "response" JSONB,
    "result" JSONB,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "listening_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listening_sessions_user_id_created_at_idx" ON "listening_sessions"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "listening_sessions" ADD CONSTRAINT "listening_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
