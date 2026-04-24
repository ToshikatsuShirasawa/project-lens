-- CreateEnum
CREATE TYPE "AiTaskCandidateEventType" AS ENUM ('SHOWN', 'ACCEPTED', 'SNOOZED', 'DISMISSED');

-- CreateTable
CREATE TABLE "ai_task_candidate_events" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "eventType" "AiTaskCandidateEventType" NOT NULL,
    "candidateTitle" TEXT NOT NULL,
    "candidateSource" TEXT NOT NULL,
    "confidenceLevel" TEXT NOT NULL,
    "recommendationReason" TEXT,
    "structuredReasonsJson" JSONB NOT NULL,
    "createdTaskId" TEXT,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metadataJson" JSONB,

    CONSTRAINT "ai_task_candidate_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_task_candidate_events_projectId_eventType_createdAt_idx" ON "ai_task_candidate_events"("projectId", "eventType", "createdAt");

CREATE INDEX "ai_task_candidate_events_projectId_createdAt_idx" ON "ai_task_candidate_events"("projectId", "createdAt");

CREATE INDEX "ai_task_candidate_events_organizationId_createdAt_idx" ON "ai_task_candidate_events"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_task_candidate_events" ADD CONSTRAINT "ai_task_candidate_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
