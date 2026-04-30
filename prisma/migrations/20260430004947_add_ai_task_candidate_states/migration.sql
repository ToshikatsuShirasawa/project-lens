-- CreateEnum
CREATE TYPE "AiTaskCandidateStatus" AS ENUM ('HELD', 'DISMISSED', 'ADDED');

-- CreateEnum
CREATE TYPE "AiTaskCandidateSource" AS ENUM ('WORK_REPORT', 'SLACK', 'MEETING');

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_invitations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ai_task_candidate_states" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "candidateKey" TEXT NOT NULL,
    "candidateTitle" TEXT NOT NULL,
    "status" "AiTaskCandidateStatus" NOT NULL,
    "sourceType" "AiTaskCandidateSource" NOT NULL DEFAULT 'WORK_REPORT',
    "sourceReportId" TEXT,
    "createdTaskId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_task_candidate_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_task_candidate_states_projectId_status_idx" ON "ai_task_candidate_states"("projectId", "status");

-- CreateIndex
CREATE INDEX "ai_task_candidate_states_sourceReportId_idx" ON "ai_task_candidate_states"("sourceReportId");

-- CreateIndex
CREATE INDEX "ai_task_candidate_states_createdTaskId_idx" ON "ai_task_candidate_states"("createdTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_task_candidate_states_projectId_candidateKey_key" ON "ai_task_candidate_states"("projectId", "candidateKey");

-- AddForeignKey
ALTER TABLE "ai_task_candidate_states" ADD CONSTRAINT "ai_task_candidate_states_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_task_candidate_states" ADD CONSTRAINT "ai_task_candidate_states_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "work_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_task_candidate_states" ADD CONSTRAINT "ai_task_candidate_states_createdTaskId_fkey" FOREIGN KEY ("createdTaskId") REFERENCES "kanban_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_task_candidate_states" ADD CONSTRAINT "ai_task_candidate_states_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
