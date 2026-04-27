-- CreateTable
CREATE TABLE "work_reports" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "submittedByUserId" TEXT,
    "submittedBy" TEXT NOT NULL,
    "completed" TEXT NOT NULL DEFAULT '',
    "inProgress" TEXT NOT NULL DEFAULT '',
    "blockers" TEXT NOT NULL DEFAULT '',
    "nextActions" TEXT NOT NULL DEFAULT '',
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_reports_projectId_idx" ON "work_reports"("projectId");

-- CreateIndex
CREATE INDEX "work_reports_projectId_reportDate_idx" ON "work_reports"("projectId", "reportDate");

-- AddForeignKey
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
