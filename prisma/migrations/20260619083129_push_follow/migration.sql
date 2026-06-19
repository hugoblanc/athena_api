-- CreateTable
CREATE TABLE "push_follow" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "mediaKey" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "push_follow_mediaKey_idx" ON "push_follow"("mediaKey");

-- CreateIndex
CREATE UNIQUE INDEX "push_follow_subscriptionId_mediaKey_key" ON "push_follow"("subscriptionId", "mediaKey");

-- AddForeignKey
ALTER TABLE "push_follow" ADD CONSTRAINT "push_follow_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "push_subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
