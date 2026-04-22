-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "kanban_tasks" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "priority" "TaskPriority";

-- CreateIndex
CREATE INDEX "kanban_tasks_projectId_dueDate_idx" ON "kanban_tasks"("projectId", "dueDate");
