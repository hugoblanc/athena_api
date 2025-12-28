-- CreateTable
CREATE TABLE "podcast" (
    "id" SERIAL NOT NULL,
    "contentId" INTEGER NOT NULL,
    "dialogueText" TEXT NOT NULL,
    "audioUrl" VARCHAR(250) NOT NULL,
    "duration" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "podcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "podcast_contentId_key" ON "podcast"("contentId");

-- CreateIndex
CREATE INDEX "podcast_status_idx" ON "podcast"("status");

-- CreateIndex
CREATE INDEX "podcast_createdAt_idx" ON "podcast"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "podcast" ADD CONSTRAINT "podcast_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
