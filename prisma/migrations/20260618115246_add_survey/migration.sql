-- CreateTable
CREATE TABLE "survey_response" (
    "id" SERIAL NOT NULL,
    "survey" TEXT NOT NULL DEFAULT 'iran',
    "message" TEXT NOT NULL,
    "contact" VARCHAR(255),
    "country" VARCHAR(2),
    "locale" VARCHAR(8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_response_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "survey_response_survey_createdAt_idx" ON "survey_response"("survey", "createdAt");
