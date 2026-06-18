-- CreateTable
CREATE TABLE "idea" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'feature',
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" INTEGER,
    "githubIssueNumber" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_vote" (
    "id" SERIAL NOT NULL,
    "ideaId" INTEGER NOT NULL,
    "userId" INTEGER,
    "anonKey" VARCHAR(64),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idea_githubIssueNumber_key" ON "idea"("githubIssueNumber");

-- CreateIndex
CREATE INDEX "idea_status_idx" ON "idea"("status");

-- CreateIndex
CREATE INDEX "idea_type_idx" ON "idea"("type");

-- CreateIndex
CREATE INDEX "idea_voteCount_idx" ON "idea"("voteCount" DESC);

-- CreateIndex
CREATE INDEX "idea_vote_ideaId_idx" ON "idea_vote"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "idea_vote_ideaId_userId_key" ON "idea_vote"("ideaId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "idea_vote_ideaId_anonKey_key" ON "idea_vote"("ideaId", "anonKey");

-- AddForeignKey
ALTER TABLE "idea" ADD CONSTRAINT "idea_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_vote" ADD CONSTRAINT "idea_vote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_vote" ADD CONSTRAINT "idea_vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
