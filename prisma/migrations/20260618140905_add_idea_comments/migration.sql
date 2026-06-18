-- AlterTable
ALTER TABLE "comment" ADD COLUMN     "ideaId" INTEGER;

-- CreateIndex
CREATE INDEX "comment_ideaId_idx" ON "comment"("ideaId");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
