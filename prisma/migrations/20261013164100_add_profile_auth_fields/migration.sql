-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "email" TEXT NOT NULL,
ADD COLUMN "email_verified" TIMESTAMP(3),
ADD COLUMN "password_hash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");
