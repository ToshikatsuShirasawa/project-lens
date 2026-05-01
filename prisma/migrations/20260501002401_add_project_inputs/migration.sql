-- CreateEnum
CREATE TYPE "ProjectInputType" AS ENUM ('SLACK', 'MEETING', 'MEMO');

-- CreateTable
CREATE TABLE "project_inputs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "inputType" "ProjectInputType" NOT NULL DEFAULT 'MEETING',
    "title" TEXT,
    "body" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "submittedByUserId" TEXT,
    "submittedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_inputs_projectId_createdAt_idx" ON "project_inputs"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "project_inputs" ADD CONSTRAINT "project_inputs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
