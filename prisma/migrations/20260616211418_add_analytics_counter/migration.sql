-- CreateTable
CREATE TABLE "analytics_counter" (
    "id" SERIAL NOT NULL,
    "event" TEXT NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "ref" TEXT,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_counter_event_day_idx" ON "analytics_counter"("event", "day");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_counter_event_refType_refId_ref_day_key" ON "analytics_counter"("event", "refType", "refId", "ref", "day");
